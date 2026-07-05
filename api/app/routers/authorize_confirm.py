"""Plant authorize-confirm endpoint (spec §3.2, F-003, R-19).

Fixed price (no range, no photos). Reserve-then-charge auth hold (R-01).
Capture happens later via admin action after stock is confirmed.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from typing import Any

import psycopg2.extras
import stripe
from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel, EmailStr, Field

from app.config import BUSINESS_TZ, settings
from app.db import get_conn
from app.models.order_status import OrderStatus, transition
from app.services.capacity import SlotTakenError, WeatherBlockedError, release_slot, reserve_slot
from app.services.order_number import generate_order_number
from app.services.pricing import compute_price_for_tier

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["authorize_confirm"])

stripe.api_key = settings.stripe_secret_key


class AuthorizeConfirmRequest(BaseModel):
    service_slug: str
    config: dict[str, Any]
    urgency_tier: str
    requested_date: date
    slot: str = Field(pattern=r"^(am|pm)$")
    customer_email: EmailStr
    customer_phone: str = Field(min_length=7)
    customer_name: str = Field(min_length=1)
    service_address: str = Field(min_length=1)
    payment_method_id: str
    policy_acknowledged: bool


@router.post("/orders/authorize-confirm", status_code=201)
async def authorize_confirm(
    body: AuthorizeConfirmRequest,
    idempotency_key: str = Header(..., alias="Idempotency-Key"),
):
    """Reserve-then-charge authorize-confirm checkout for plants (R-01, R-19)."""

    if not body.policy_acknowledged:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": {"code": "ACK_REQUIRED", "message": "Policy acknowledgment is required", "details": {}}},
        )

    if body.urgency_tier not in ("tomorrow", "2_5_day", "6_14_day"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "INVALID_TIER", "message": f"Invalid urgency tier: {body.urgency_tier}", "details": {}}},
        )

    # R-09: idempotency check
    with get_conn() as conn:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(
            """
            SELECT o.order_number, o.status, o.amount_cents,
                   cs.day AS slot_day, cs.slot AS slot_time,
                   o.customer_email
            FROM orders o
            LEFT JOIN capacity_slots cs ON cs.id = o.slot_id
            WHERE o.idempotency_key = %s
            LIMIT 1
            """,
            (idempotency_key,),
        )
        existing = cur.fetchone()
        if existing:
            return {
                "order_number": existing["order_number"],
                "status": existing["status"],
                "amount_cents": existing["amount_cents"],
                "slot_day": str(existing["slot_day"]) if existing["slot_day"] else "",
                "slot_time": existing["slot_time"] or "",
                "customer_email": existing["customer_email"],
            }

    # Look up service type
    with get_conn() as conn:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(
            "SELECT id, pricing_model, fulfillment_type FROM service_types WHERE slug = %s AND active = true",
            (body.service_slug,),
        )
        svc = cur.fetchone()
        if not svc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": {"code": "INVALID_SERVICE", "message": f"Unknown service: {body.service_slug}", "details": {}}},
            )
        if svc["fulfillment_type"] != "authorize_confirm":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": {"code": "WRONG_CHECKOUT", "message": "This service does not use authorize-confirm checkout", "details": {}}},
            )

    # R-07: re-quote server-side
    total_cents, bounds_ok, bounds_reason = compute_price_for_tier(
        svc["pricing_model"], body.config, body.urgency_tier,
    )
    if not bounds_ok:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": {"code": "BOUNDS_EXCEEDED", "message": bounds_reason or "Out of bounds", "details": {}}},
        )

    # Check tomorrow cutoff (R-08)
    now = datetime.now(BUSINESS_TZ)
    if body.urgency_tier == "tomorrow":
        from app.services.pricing import _is_tomorrow_available
        if not _is_tomorrow_available(body.requested_date, now):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"error": {"code": "CUTOFF_PASSED", "message": "Tomorrow tier cutoff (4pm ET) has passed", "details": {}}},
            )

    # === TXN 1: reserve tentative slot + create order (R-01) ===
    order_number = generate_order_number()
    order_id = None

    with get_conn() as conn:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cur.execute(
            """
            INSERT INTO orders (
                order_number, service_type_id, fulfillment_type, status,
                urgency_tier, amount_cents, original_quote_cents,
                policy_acknowledged, customer_email, customer_phone,
                customer_name, service_address, idempotency_key
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            ) RETURNING id
            """,
            (
                order_number, svc["id"], "authorize_confirm",
                OrderStatus.PENDING_PAYMENT.value, body.urgency_tier,
                total_cents, total_cents,
                body.policy_acknowledged,
                body.customer_email, body.customer_phone,
                body.customer_name, body.service_address,
                idempotency_key,
            ),
        )
        order_id = str(cur.fetchone()["id"])

        try:
            slot_result = reserve_slot(
                conn, body.requested_date, body.slot, order_id, "tentative",
            )
        except SlotTakenError:
            conn.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"error": {"code": "SLOT_TAKEN", "message": "That time was just booked — please pick another slot.", "details": {}}},
            )
        except WeatherBlockedError:
            conn.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"error": {"code": "WEATHER_BLOCKED", "message": "This slot is currently blocked due to weather.", "details": {}}},
            )

        cur.execute(
            "UPDATE orders SET slot_id = %s WHERE id = %s",
            (slot_result.slot_id, order_id),
        )
        conn.commit()

    # === STRIPE AUTH HOLD (outside DB transaction — R-01) ===
    try:
        payment_intent = stripe.PaymentIntent.create(
            amount=total_cents,
            currency="usd",
            payment_method=body.payment_method_id,
            confirm=True,
            capture_method="manual",
            metadata={"order_id": order_id, "order_number": order_number},
            idempotency_key=idempotency_key,
            automatic_payment_methods={"enabled": True, "allow_redirects": "never"},
        )
    except stripe.CardError as e:
        logger.warning("Stripe auth hold declined for plant order %s: %s", order_id, e)
        with get_conn() as conn:
            release_slot(conn, order_id)
            cur = conn.cursor()
            cur.execute(
                "UPDATE orders SET status = %s WHERE id = %s",
                (transition(OrderStatus.PENDING_PAYMENT, OrderStatus.CANCELLED).value, order_id),
            )
            conn.commit()
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={"error": {"code": "PAYMENT_FAILED", "message": "Your card couldn't be authorized. Please try another card.", "details": {}}},
        )
    except stripe.StripeError as e:
        logger.error("Stripe call ambiguous for plant order %s: %s", order_id, e)
        with get_conn() as conn:
            release_slot(conn, order_id)
            cur = conn.cursor()
            cur.execute(
                "UPDATE orders SET slot_id = NULL WHERE id = %s",
                (order_id,),
            )
            conn.commit()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"error": {"code": "PAYMENT_UNCERTAIN", "message": "We couldn't confirm your authorization. If a hold was placed, it will be resolved automatically. Please try again or call us.", "details": {}}},
        )

    # === TXN 2: confirm authorization ===
    auth_status = transition(OrderStatus.PENDING_PAYMENT, OrderStatus.AUTHORIZED)
    auth_expires = now + timedelta(days=7)

    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            UPDATE orders SET
                status = %s,
                stripe_payment_intent_id = %s,
                stripe_auth_expires_at = %s
            WHERE id = %s
            """,
            (auth_status.value, payment_intent.id, auth_expires, order_id),
        )
        cur.execute(
            """
            INSERT INTO order_events (order_id, event_type, detail)
            VALUES (%s, 'authorized', %s)
            """,
            (
                order_id,
                psycopg2.extras.Json({
                    "amount_cents": total_cents,
                    "stripe_pi": payment_intent.id,
                }),
            ),
        )
        conn.commit()

    return {
        "order_number": order_number,
        "status": OrderStatus.AUTHORIZED.value,
        "amount_cents": total_cents,
        "slot_day": str(body.requested_date),
        "slot_time": body.slot,
        "customer_email": body.customer_email,
        "message": "Your order has been placed. An authorization hold has been placed on your card — you will not be charged until stock availability is confirmed.",
    }
