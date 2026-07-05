"""Estimate endpoints: tree removal submission (spec §3.2, F-009).

Reserve-then-charge with manual capture (R-01). Auth hold placed at
range_high_cents. Tentative 48h soft-hold. No urgency tier (R-34).
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from typing import Annotated

import psycopg2.extras
import stripe
from fastapi import APIRouter, File, Form, Header, HTTPException, UploadFile, status

from app.config import BUSINESS_TZ, settings
from app.db import get_conn
from app.models.order_status import OrderStatus, transition
from app.services.capacity import SlotTakenError, WeatherBlockedError, release_slot, reserve_slot
from app.services.order_number import generate_order_number
from app.services.photos import PhotoValidationError, validate_and_save
from app.services.pricing import compute_estimate_range

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["estimates"])

stripe.api_key = settings.stripe_secret_key

MAX_PHOTOS = 5


@router.post("/estimates", status_code=201)
async def submit_estimate(
    service_slug: Annotated[str, Form()],
    approx_height_stories: Annotated[str, Form()],
    access_difficulty: Annotated[str, Form()],
    distance_to_structure_ft: Annotated[int, Form()],
    access_notes: Annotated[str, Form()] = "",
    requested_date: Annotated[str, Form()] = "",
    slot: Annotated[str, Form()] = "",
    customer_email: Annotated[str, Form()] = "",
    customer_phone: Annotated[str, Form()] = "",
    customer_name: Annotated[str, Form()] = "",
    service_address: Annotated[str, Form()] = "",
    payment_method_id: Annotated[str, Form()] = "",
    acknowledged: Annotated[bool, Form()] = False,
    policy_acknowledged: Annotated[bool, Form()] = False,
    idempotency_key: str = Header(..., alias="Idempotency-Key"),
    photos: list[UploadFile] = File(default=[]),
):
    """Submit a tree-removal estimate with reserve-then-charge auth hold (R-01)."""

    if not acknowledged:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": {"code": "ACK_REQUIRED", "message": "Estimate acknowledgment is required", "details": {}}},
        )
    if not policy_acknowledged:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": {"code": "ACK_REQUIRED", "message": "Policy acknowledgment is required", "details": {}}},
        )

    if slot not in ("am", "pm"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "INVALID_SLOT", "message": "Slot must be 'am' or 'pm'", "details": {}}},
        )

    for field_name, field_val in [
        ("customer_email", customer_email), ("customer_phone", customer_phone),
        ("customer_name", customer_name), ("service_address", service_address),
        ("payment_method_id", payment_method_id), ("requested_date", requested_date),
    ]:
        if not field_val.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"error": {"code": "MISSING_FIELD", "message": f"{field_name} is required", "details": {}}},
            )

    try:
        req_date = date.fromisoformat(requested_date)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "INVALID_DATE", "message": "Invalid date format", "details": {}}},
        )

    if len(photos) > MAX_PHOTOS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": {"code": "TOO_MANY_PHOTOS", "message": f"Maximum {MAX_PHOTOS} photos allowed", "details": {}}},
        )

    # R-09: idempotency check
    with get_conn() as conn:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(
            """
            SELECT o.order_number, o.status, o.amount_cents,
                   cs.day AS slot_day, cs.slot AS slot_time,
                   o.customer_email, e.range_low_cents, e.range_high_cents, e.valid_until
            FROM orders o
            LEFT JOIN capacity_slots cs ON cs.id = o.slot_id
            LEFT JOIN estimates e ON e.order_id = o.id
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
                "range_low_cents": existing["range_low_cents"],
                "range_high_cents": existing["range_high_cents"],
                "valid_until": existing["valid_until"].isoformat() if existing["valid_until"] else None,
            }

    # Look up service type
    with get_conn() as conn:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(
            "SELECT id, pricing_model, fulfillment_type FROM service_types WHERE slug = %s AND active = true",
            (service_slug,),
        )
        svc = cur.fetchone()
        if not svc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": {"code": "INVALID_SERVICE", "message": f"Unknown service: {service_slug}", "details": {}}},
            )
        if svc["fulfillment_type"] != "estimate":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": {"code": "WRONG_CHECKOUT", "message": "This service does not use estimate checkout", "details": {}}},
            )

    config = {
        "approx_height_stories": approx_height_stories,
        "access_difficulty": access_difficulty,
    }

    range_low, range_high, ok, reason = compute_estimate_range(svc["pricing_model"], config)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": {"code": "ESTIMATE_ERROR", "message": reason or "Cannot compute estimate", "details": {}}},
        )

    # Process photos (R-11)
    saved_photos: list[tuple[str, str]] = []
    try:
        for photo in photos:
            data = await photo.read()
            try:
                file_path, filename = validate_and_save(data, photo.filename or "photo.jpg")
                saved_photos.append((file_path, filename))
            except PhotoValidationError as e:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail={"error": {"code": "BAD_PHOTO", "message": str(e), "details": {"filename": photo.filename}}},
                )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Photo processing error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "PHOTO_ERROR", "message": "Failed to process uploaded photos", "details": {}}},
        )

    # === TXN 1: reserve slot + create order + estimate + photos (R-01) ===
    order_number = generate_order_number()
    order_id = None
    now = datetime.now(BUSINESS_TZ)
    valid_until = now + timedelta(hours=48)

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
                %s, %s, %s, %s, NULL, %s, %s, %s, %s, %s, %s, %s, %s
            ) RETURNING id
            """,
            (
                order_number, svc["id"], "estimate",
                OrderStatus.PENDING_PAYMENT.value,
                range_high,  # auth hold at range_high
                range_high,
                policy_acknowledged,
                customer_email, customer_phone,
                customer_name, service_address,
                idempotency_key,
            ),
        )
        order_id = str(cur.fetchone()["id"])

        try:
            slot_result = reserve_slot(conn, req_date, slot, order_id, "tentative")
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

        cur.execute(
            """
            INSERT INTO estimates (
                order_id, range_low_cents, range_high_cents, valid_until,
                acknowledged, approx_height_stories, distance_to_structure_ft,
                access_notes
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                order_id, range_low, range_high, valid_until,
                True,
                int(approx_height_stories) if approx_height_stories.isdigit() else None,
                distance_to_structure_ft,
                access_notes or None,
            ),
        )
        estimate_id = str(cur.fetchone()["id"])

        purge_after = (now + timedelta(days=90)).date()
        for file_path, _filename in saved_photos:
            cur.execute(
                """
                INSERT INTO estimate_photos (estimate_id, file_path, purge_after)
                VALUES (%s, %s, %s)
                """,
                (estimate_id, file_path, purge_after),
            )

        conn.commit()

    # === STRIPE AUTH HOLD (outside any DB transaction — R-01) ===
    # capture_method=manual creates an auth hold, not an immediate capture
    try:
        payment_intent = stripe.PaymentIntent.create(
            amount=range_high,
            currency="usd",
            payment_method=payment_method_id,
            confirm=True,
            capture_method="manual",
            metadata={"order_id": order_id, "order_number": order_number},
            idempotency_key=idempotency_key,
            automatic_payment_methods={"enabled": True, "allow_redirects": "never"},
        )
    except stripe.CardError as e:
        logger.warning("Stripe auth hold declined for estimate %s: %s", order_id, e)
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
        logger.error("Stripe call ambiguous for estimate %s: %s", order_id, e)
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
    # Stripe auth holds typically expire in ~7 days; store for reminder job
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
                    "amount_cents": range_high,
                    "range_low_cents": range_low,
                    "range_high_cents": range_high,
                    "stripe_pi": payment_intent.id,
                    "photo_count": len(saved_photos),
                }),
            ),
        )
        conn.commit()

    return {
        "order_number": order_number,
        "status": OrderStatus.AUTHORIZED.value,
        "amount_cents": range_high,
        "range_low_cents": range_low,
        "range_high_cents": range_high,
        "valid_until": valid_until.isoformat(),
        "slot_day": str(req_date),
        "slot_time": slot,
        "customer_email": customer_email,
        "message": "Your estimate has been submitted. An authorization hold has been placed on your card — you will not be charged until the crew confirms the final price on-site.",
    }
