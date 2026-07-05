"""Order endpoints: BIN checkout + guest lookup (spec §3.2).

The BIN checkout implements the reserve-then-charge pattern (R-01):
never hold a DB transaction open across the Stripe network call.
"""

from __future__ import annotations

import logging
import time
from datetime import date, datetime, timedelta
from typing import Any

import psycopg2.extras
import stripe
from fastapi import APIRouter, Header, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field

from app.config import BUSINESS_TZ, settings
from app.db import get_conn
from app.models.order_status import OrderStatus, transition
from app.services.capacity import SlotTakenError, WeatherBlockedError, release_slot, reserve_slot
from app.services.order_number import generate_order_number
from app.services.pricing import compute_price_for_tier
from app.services.reauth_token import verify_reauth_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["orders"])

stripe.api_key = settings.stripe_secret_key


# --- BIN bump-tentative logic (R-04) ---


def _try_bump_tentative(conn, cur, day: date, slot: str, new_order_id: str):
    """If the slot holds a tentative hold, bump it and assign to the new BIN order.

    Returns a SlotReservation-like result or None if the slot isn't tentative.
    """
    from app.services.capacity import SlotReservation, get_available_slots

    cur.execute(
        """
        SELECT cs.id AS slot_id, cs.order_id AS bumped_order_id, cs.hold_type,
               o.status AS bumped_status, o.stripe_payment_intent_id AS bumped_pi
        FROM capacity_slots cs
        JOIN orders o ON o.id = cs.order_id
        WHERE cs.day = %s AND cs.slot = %s
        FOR UPDATE OF cs
        """,
        (day, slot),
    )
    existing = cur.fetchone()

    if not existing or existing["hold_type"] != "tentative":
        return None

    bumped_order_id = str(existing["bumped_order_id"])

    # Bump the tentative hold: retain Stripe auth, move to needs_reslot
    cur.execute("DELETE FROM capacity_slots WHERE id = %s", (existing["slot_id"],))
    cur.execute(
        "UPDATE orders SET slot_id = NULL, status = %s WHERE id = %s",
        (OrderStatus.NEEDS_RESLOT.value, bumped_order_id),
    )

    # Attempt auto-reflow: find the next available slot and offer it
    reflow_detail = _attempt_auto_reflow(conn, cur, bumped_order_id, day)

    cur.execute(
        """
        INSERT INTO order_events (order_id, event_type, detail)
        VALUES (%s, 'bumped_by_bin', %s)
        """,
        (
            bumped_order_id,
            psycopg2.extras.Json({
                "bumped_by_order_id": new_order_id,
                "old_slot_day": str(day),
                "old_slot": slot,
                "retained_pi": existing["bumped_pi"],
                "auto_reflow": reflow_detail,
            }),
        ),
    )

    # Now reserve for the BIN order
    from app.services.capacity import reserve_slot as _reserve
    return _reserve(conn, day, slot, new_order_id, "confirmed")


def _attempt_auto_reflow(conn, cur, bumped_order_id: str, original_day: date) -> dict:
    """Try to auto-assign the bumped order to the next available slot (R-04)."""
    from app.services.capacity import get_available_slots

    for delta in range(1, 8):
        check_day = original_day + timedelta(days=delta)
        avail = get_available_slots(conn, check_day)
        for s in ("am", "pm"):
            if avail.get(s):
                return {
                    "offered_day": str(check_day),
                    "offered_slot": s,
                    "status": "offered",
                }

    return {"status": "no_slot_available"}


# --- BIN Checkout ---


class BinCheckoutRequest(BaseModel):
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


class BinCheckoutResponse(BaseModel):
    order_number: str
    status: str
    amount_cents: int
    slot_day: str
    slot_time: str
    customer_email: str


@router.post("/orders/bin", status_code=201)
async def bin_checkout(
    body: BinCheckoutRequest,
    idempotency_key: str = Header(..., alias="Idempotency-Key"),
) -> BinCheckoutResponse:
    """Reserve-then-charge BIN checkout (R-01)."""

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

    # R-09: idempotency — check if we already created an order with this key
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
            return BinCheckoutResponse(
                order_number=existing["order_number"],
                status=existing["status"],
                amount_cents=existing["amount_cents"],
                slot_day=str(existing["slot_day"]) if existing["slot_day"] else "",
                slot_time=existing["slot_time"] or "",
                customer_email=existing["customer_email"],
            )

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

        if svc["fulfillment_type"] != "bin_immediate":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": {"code": "WRONG_CHECKOUT", "message": "This service does not use BIN checkout", "details": {}}},
            )

    # R-07: re-quote server-side — never trust a client-computed price
    total_cents, bounds_ok, bounds_reason = compute_price_for_tier(
        svc["pricing_model"], body.config, body.urgency_tier
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

    # === TXN 1: reserve slot + create pending_payment order (R-01) ===
    # Order: create order (slot_id=NULL) → insert slot (with order_id) → update order.slot_id
    # This resolves the circular FK between orders.slot_id and capacity_slots.order_id.
    order_number = generate_order_number()
    order_id = None
    slot_result = None

    with get_conn() as conn:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # Step 1: create the order without slot_id
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
                order_number, svc["id"], svc["fulfillment_type"],
                OrderStatus.PENDING_PAYMENT.value, body.urgency_tier,
                total_cents, total_cents, body.policy_acknowledged,
                body.customer_email, body.customer_phone,
                body.customer_name, body.service_address,
                idempotency_key,
            ),
        )
        order_id = str(cur.fetchone()["id"])

        # Step 2: reserve the slot (with order_id)
        # R-04: BIN bumps tentative holds — if slot is taken by a tentative
        # estimate/plant hold, bump it and take the slot.
        try:
            slot_result = reserve_slot(
                conn, body.requested_date, body.slot, order_id, "confirmed"
            )
        except SlotTakenError:
            slot_result = _try_bump_tentative(
                conn, cur, body.requested_date, body.slot, order_id,
            )
            if slot_result is None:
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

        # Step 3: update order with slot_id
        cur.execute(
            "UPDATE orders SET slot_id = %s WHERE id = %s",
            (slot_result.slot_id, order_id),
        )

        conn.commit()  # TXN 1 committed — slot reserved, order created

    # === STRIPE CAPTURE (outside any DB transaction — R-01) ===
    try:
        payment_intent = stripe.PaymentIntent.create(
            amount=total_cents,
            currency="usd",
            payment_method=body.payment_method_id,
            confirm=True,
            capture_method="automatic",
            metadata={"order_id": order_id, "order_number": order_number},
            idempotency_key=idempotency_key,
            automatic_payment_methods={"enabled": True, "allow_redirects": "never"},
        )
    except stripe.CardError as e:
        # Definitive decline — card was NOT charged. Cancel + release.
        logger.warning("Stripe payment declined for order %s: %s", order_id, e)
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
            detail={"error": {"code": "PAYMENT_FAILED", "message": "Your payment couldn't be processed. Please try another card.", "details": {}}},
        )
    except stripe.StripeError as e:
        # Ambiguous failure (timeout/network) — Stripe MAY have charged.
        # Release slot but keep order as pending_payment so the webhook can
        # reconcile if payment_intent.succeeded arrives (R-01).
        logger.error(
            "Stripe call ambiguous for order %s (may have charged): %s", order_id, e
        )
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
            detail={"error": {"code": "PAYMENT_UNCERTAIN", "message": "We couldn't confirm your payment. If you were charged, it will be resolved automatically — no double charge. Please try again or call us.", "details": {}}},
        )

    # === TXN 2: confirm capture ===
    captured_status = transition(OrderStatus.PENDING_PAYMENT, OrderStatus.CAPTURED)
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            UPDATE orders SET
                status = %s,
                stripe_payment_intent_id = %s
            WHERE id = %s
            """,
            (captured_status.value, payment_intent.id, order_id),
        )
        cur.execute(
            """
            INSERT INTO order_events (order_id, event_type, detail)
            VALUES (%s, 'captured', %s)
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

    return BinCheckoutResponse(
        order_number=order_number,
        status=OrderStatus.CAPTURED.value,
        amount_cents=total_cents,
        slot_day=str(body.requested_date),
        slot_time=body.slot,
        customer_email=body.customer_email,
    )


# --- Guest Lookup (R-12/R-16) ---

_LOOKUP_NOT_FOUND = {
    "error": {
        "code": "LOOKUP_NOT_FOUND",
        "message": "We couldn't find that order. Call us and we'll help.",
        "details": {},
    }
}

_lookup_rate: dict[str, list[float]] = {}
LOOKUP_RATE_LIMIT = 5
LOOKUP_RATE_WINDOW = 60  # seconds


def _check_rate_limit(client_ip: str) -> bool:
    now = time.time()
    times = _lookup_rate.get(client_ip, [])
    times = [t for t in times if now - t < LOOKUP_RATE_WINDOW]
    if len(times) >= LOOKUP_RATE_LIMIT:
        return False
    times.append(now)
    _lookup_rate[client_ip] = times
    return True


@router.get("/orders/lookup")
async def order_lookup(
    request: Request,
    order_number: str,
    email: str,
):
    """Guest order lookup — uniform 404 for both no-order and email-mismatch (R-12/R-16)."""
    client_ip = request.client.host if request.client else "unknown"

    if not _check_rate_limit(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={"error": {"code": "RATE_LIMITED", "message": "Too many requests. Please wait and try again.", "details": {}}},
        )

    # Constant-time-ish: always query, compare email in Python
    with get_conn() as conn:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(
            """
            SELECT o.order_number, o.status, o.amount_cents, o.customer_email,
                   o.customer_name, o.service_address, o.urgency_tier,
                   o.created_at,
                   st.name AS service_name,
                   cs.day AS slot_day, cs.slot AS slot_time
            FROM orders o
            JOIN service_types st ON st.id = o.service_type_id
            LEFT JOIN capacity_slots cs ON cs.id = o.slot_id
            WHERE o.order_number = %s
            LIMIT 1
            """,
            (order_number,),
        )
        row = cur.fetchone()

    if row is None or row["customer_email"].lower() != email.lower():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=_LOOKUP_NOT_FOUND,
        )

    return {
        "order_number": row["order_number"],
        "status": row["status"],
        "amount_cents": row["amount_cents"],
        "service_name": row["service_name"],
        "urgency_tier": row["urgency_tier"],
        "slot_day": str(row["slot_day"]) if row["slot_day"] else None,
        "slot_time": row["slot_time"],
        "service_address": row["service_address"],
        "created_at": row["created_at"].isoformat() if row["created_at"] else None,
    }


# --- Customer Re-authorization (Extend flow completion, R-05) ---


class ReauthorizeRequest(BaseModel):
    order_id: str
    token: str
    payment_method_id: str


@router.post("/orders/reauthorize")
async def reauthorize(body: ReauthorizeRequest):
    """Customer-facing re-authorization — completes the Extend admin action (R-05).

    Auth is via HMAC token from the emailed link, not admin JWT.
    """
    if not verify_reauth_token(body.order_id, body.token):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "INVALID_TOKEN", "message": "Invalid or expired re-authorization link", "details": {}}},
        )

    with get_conn() as conn:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(
            "SELECT id, status, amount_cents, stripe_payment_intent_id, order_number FROM orders WHERE id = %s",
            (body.order_id,),
        )
        order = cur.fetchone()

    if not order:
        raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Order not found", "details": {}}})

    current = OrderStatus(order["status"])
    if current != OrderStatus.AUTHORIZED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error": {"code": "INVALID_STATE", "message": "This order is no longer awaiting re-authorization", "details": {}}},
        )

    old_pi = order["stripe_payment_intent_id"]

    try:
        new_pi = stripe.PaymentIntent.create(
            amount=order["amount_cents"],
            currency="usd",
            payment_method=body.payment_method_id,
            confirm=True,
            capture_method="manual",
            metadata={"order_id": body.order_id, "order_number": order["order_number"]},
            automatic_payment_methods={"enabled": True, "allow_redirects": "never"},
        )
    except stripe.CardError:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={"error": {"code": "PAYMENT_FAILED", "message": "Your card couldn't be authorized. Please try another card.", "details": {}}},
        )
    except stripe.StripeError as e:
        logger.error("Stripe re-auth failed for order %s: %s", body.order_id, e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"error": {"code": "PAYMENT_UNCERTAIN", "message": "We couldn't confirm your authorization. Please try again.", "details": {}}},
        )

    # Void old PI — the canceled webhook for old PI will be ignored (R-05)
    if old_pi:
        try:
            stripe.PaymentIntent.cancel(old_pi)
        except stripe.StripeError as e:
            logger.warning("Failed to void old PI %s: %s", old_pi, e)

    from app.config import BUSINESS_TZ
    now = datetime.now(BUSINESS_TZ)
    auth_expires = now + timedelta(days=7)

    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            UPDATE orders SET
                stripe_payment_intent_id = %s,
                stripe_auth_expires_at = %s
            WHERE id = %s
            """,
            (new_pi.id, auth_expires, body.order_id),
        )
        cur.execute(
            """
            INSERT INTO order_events (order_id, event_type, detail)
            VALUES (%s, 'reauthorized_same', %s)
            """,
            (
                body.order_id,
                psycopg2.extras.Json({
                    "action": "customer_reauth_completed",
                    "old_pi": old_pi,
                    "new_pi": new_pi.id,
                    "amount_cents": order["amount_cents"],
                }),
            ),
        )
        conn.commit()

    return {
        "status": "reauthorized",
        "order_number": order["order_number"],
        "message": "Your authorization has been renewed. You will not be charged until the crew confirms.",
    }
