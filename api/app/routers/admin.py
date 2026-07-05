"""Admin API (spec §3.2 — dashboard, capacity, order search, order actions, reschedule).

Phase 03: dashboard view, weather-block toggle, customer search.
Phase 05: order actions (capture/cancel/extend), reschedule, photo serve.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from typing import Any

import psycopg2.extras
import stripe
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.auth.admin import AdminPrincipal, get_current_admin
from app.config import BUSINESS_TZ, settings
from app.db import get_conn
from app.models.order_status import InvalidTransitionError, OrderStatus, transition
from app.services.capacity import SlotTakenError, WeatherBlockedError, release_slot, reserve_slot
from app.services.photos import read_photo
from app.services.reauth_token import generate_reauth_token

logger = logging.getLogger(__name__)

stripe.api_key = settings.stripe_secret_key

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


@router.get("/ping")
async def ping(admin: AdminPrincipal = Depends(get_current_admin)):
    return {"status": "ok", "admin_uid": admin.uid, "role": admin.role}


# --- Dashboard ---


class SlotView(BaseModel):
    day: str
    slot: str
    hold_type: str
    order_id: str | None
    order_number: str | None
    customer_name: str | None
    service_name: str | None
    status: str | None


class DayView(BaseModel):
    day: str
    am_blocked: bool
    pm_blocked: bool
    slots: list[SlotView]


class NeedsReslotOrder(BaseModel):
    order_id: str
    order_number: str
    customer_name: str
    customer_phone: str
    service_name: str
    amount_cents: int
    created_at: str


class DashboardResponse(BaseModel):
    days: list[DayView]
    needs_reslot: list[NeedsReslotOrder]
    total_confirmed: int
    total_tentative: int


@router.get("/dashboard")
async def dashboard(
    admin: AdminPrincipal = Depends(get_current_admin),
    range: str = Query("week", pattern=r"^(today|tomorrow|week)$"),
) -> DashboardResponse:
    now = datetime.now(BUSINESS_TZ)
    today = now.date()

    if range == "today":
        start, end = today, today
    elif range == "tomorrow":
        start = today + timedelta(days=1)
        end = start
    else:
        start = today
        end = today + timedelta(days=6)

    with get_conn() as conn:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # Get days with their block status
        cur.execute(
            """
            SELECT day, am_blocked, pm_blocked
            FROM capacity_days
            WHERE day BETWEEN %s AND %s
            ORDER BY day
            """,
            (start, end),
        )
        day_rows = {row["day"]: row for row in cur.fetchall()}

        # Get all slots in range
        cur.execute(
            """
            SELECT cs.day, cs.slot, cs.hold_type, cs.order_id,
                   o.order_number, o.customer_name, o.status,
                   st.name AS service_name
            FROM capacity_slots cs
            LEFT JOIN orders o ON o.id = cs.order_id
            LEFT JOIN service_types st ON st.id = o.service_type_id
            WHERE cs.day BETWEEN %s AND %s
            ORDER BY cs.day, cs.slot
            """,
            (start, end),
        )
        slot_rows = cur.fetchall()

        # Build day views
        days: list[DayView] = []
        total_confirmed = 0
        total_tentative = 0

        current = start
        while current <= end:
            day_info = day_rows.get(current)
            am_blocked = day_info["am_blocked"] if day_info else False
            pm_blocked = day_info["pm_blocked"] if day_info else False

            day_slots = [r for r in slot_rows if r["day"] == current]
            slot_views = []
            for s in day_slots:
                slot_views.append(SlotView(
                    day=str(s["day"]),
                    slot=s["slot"],
                    hold_type=s["hold_type"],
                    order_id=str(s["order_id"]) if s["order_id"] else None,
                    order_number=s["order_number"],
                    customer_name=s["customer_name"],
                    service_name=s["service_name"],
                    status=s["status"],
                ))
                if s["hold_type"] == "confirmed":
                    total_confirmed += 1
                elif s["hold_type"] == "tentative":
                    total_tentative += 1

            days.append(DayView(
                day=str(current),
                am_blocked=am_blocked,
                pm_blocked=pm_blocked,
                slots=slot_views,
            ))
            current += timedelta(days=1)

        # Needs reslot orders (R-03/R-04)
        cur.execute(
            """
            SELECT o.id AS order_id, o.order_number, o.customer_name,
                   o.customer_phone, o.amount_cents, o.created_at,
                   st.name AS service_name
            FROM orders o
            JOIN service_types st ON st.id = o.service_type_id
            WHERE o.status = 'needs_reslot'
            ORDER BY o.created_at
            """,
        )
        needs_reslot = [
            NeedsReslotOrder(
                order_id=str(r["order_id"]),
                order_number=r["order_number"],
                customer_name=r["customer_name"],
                customer_phone=r["customer_phone"],
                service_name=r["service_name"],
                amount_cents=r["amount_cents"],
                created_at=r["created_at"].isoformat(),
            )
            for r in cur.fetchall()
        ]

    return DashboardResponse(
        days=days,
        needs_reslot=needs_reslot,
        total_confirmed=total_confirmed,
        total_tentative=total_tentative,
    )


# --- Customer Search (R-22) ---


class OrderSearchResult(BaseModel):
    order_id: str
    order_number: str
    customer_name: str
    customer_phone: str
    customer_email: str
    status: str
    service_name: str
    amount_cents: int
    created_at: str


@router.get("/orders/search")
async def search_orders(
    admin: AdminPrincipal = Depends(get_current_admin),
    q: str = Query(..., min_length=2),
) -> list[OrderSearchResult]:
    with get_conn() as conn:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        search = f"%{q}%"
        cur.execute(
            """
            SELECT o.id AS order_id, o.order_number, o.customer_name,
                   o.customer_phone, o.customer_email, o.status,
                   o.amount_cents, o.created_at,
                   st.name AS service_name
            FROM orders o
            JOIN service_types st ON st.id = o.service_type_id
            WHERE o.customer_name ILIKE %s
               OR o.customer_phone LIKE %s
               OR o.order_number = %s
            ORDER BY o.created_at DESC
            LIMIT 50
            """,
            (search, search, q),
        )
        return [
            OrderSearchResult(
                order_id=str(r["order_id"]),
                order_number=r["order_number"],
                customer_name=r["customer_name"],
                customer_phone=r["customer_phone"],
                customer_email=r["customer_email"],
                status=r["status"],
                service_name=r["service_name"],
                amount_cents=r["amount_cents"],
                created_at=r["created_at"].isoformat(),
            )
            for r in cur.fetchall()
        ]


# --- Weather Block Toggle (F-011, R-15) ---


class WeatherBlockRequest(BaseModel):
    am_blocked: bool | None = None
    pm_blocked: bool | None = None


@router.put("/capacity/{day}")
async def toggle_weather_block(
    day: date,
    body: WeatherBlockRequest,
    admin: AdminPrincipal = Depends(get_current_admin),
):
    if body.am_blocked is None and body.pm_blocked is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "INVALID_REQUEST", "message": "Provide am_blocked and/or pm_blocked", "details": {}}},
        )

    with get_conn() as conn:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # R-14: lazy day materialization
        cur.execute(
            "INSERT INTO capacity_days (day) VALUES (%s) ON CONFLICT (day) DO NOTHING",
            (day,),
        )

        updates = []
        params: list[Any] = []
        if body.am_blocked is not None:
            updates.append("am_blocked = %s")
            params.append(body.am_blocked)
        if body.pm_blocked is not None:
            updates.append("pm_blocked = %s")
            params.append(body.pm_blocked)
        params.append(day)

        cur.execute(
            f"UPDATE capacity_days SET {', '.join(updates)} WHERE day = %s RETURNING *",
            params,
        )
        result = cur.fetchone()

        # R-30: when blocking a half, bump existing tentative holds to needs_reslot
        # (confirmed jobs stay — only tentative holds are displaced)
        for half in ("am", "pm"):
            blocked_flag = body.am_blocked if half == "am" else body.pm_blocked
            if blocked_flag:
                cur.execute(
                    """
                    SELECT cs.id AS slot_id, cs.order_id, o.status AS order_status
                    FROM capacity_slots cs
                    JOIN orders o ON o.id = cs.order_id
                    WHERE cs.day = %s AND cs.slot = %s AND cs.hold_type = 'tentative'
                    """,
                    (day, half),
                )
                for row in cur.fetchall():
                    cur.execute("DELETE FROM capacity_slots WHERE id = %s", (row["slot_id"],))
                    cur.execute("UPDATE orders SET slot_id = NULL WHERE id = %s", (row["order_id"],))
                    if row["order_status"] in ("authorized", "confirmed_scheduled"):
                        cur.execute(
                            "UPDATE orders SET status = 'needs_reslot' WHERE id = %s",
                            (row["order_id"],),
                        )
                        cur.execute(
                            """
                            INSERT INTO order_events (order_id, event_type, detail)
                            VALUES (%s, 'bumped_by_bin', %s)
                            """,
                            (
                                row["order_id"],
                                psycopg2.extras.Json({
                                    "reason": "weather_block",
                                    "blocked_day": str(day),
                                    "blocked_slot": half,
                                }),
                            ),
                        )

        conn.commit()

    return {
        "day": str(result["day"]),
        "am_blocked": result["am_blocked"],
        "pm_blocked": result["pm_blocked"],
    }


# --- Order Actions (F-013, Option B — three only: capture/cancel/extend) ---


class OrderActionRequest(BaseModel):
    action: str = Field(pattern=r"^(capture|cancel|extend)$")


@router.post("/orders/{order_id}/action")
async def order_action(
    order_id: str,
    body: OrderActionRequest,
    admin: AdminPrincipal = Depends(get_current_admin),
):
    """Execute one of the three Option B admin actions (R-02)."""
    if body.action == "capture":
        return await _action_capture(order_id, admin)
    elif body.action == "cancel":
        return await _action_cancel(order_id, admin)
    elif body.action == "extend":
        return await _action_extend(order_id, admin)


async def _action_capture(order_id: str, admin: AdminPrincipal):
    """Capture: atomic slot re-assertion (R-03), then Stripe capture."""
    with get_conn() as conn:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cur.execute(
            """
            SELECT o.id, o.status, o.amount_cents, o.stripe_payment_intent_id,
                   o.slot_id, o.order_number, cs.day, cs.slot
            FROM orders o
            LEFT JOIN capacity_slots cs ON cs.id = o.slot_id
            WHERE o.id = %s
            FOR UPDATE OF o
            """,
            (order_id,),
        )
        order = cur.fetchone()
        if not order:
            raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Order not found", "details": {}}})

        current = OrderStatus(order["status"])
        if current not in (OrderStatus.AUTHORIZED, OrderStatus.CONFIRMED_SCHEDULED):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"error": {"code": "INVALID_STATE", "message": f"Cannot capture order in '{current.value}' state", "details": {}}},
            )

        if not order["stripe_payment_intent_id"]:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"error": {"code": "NO_PI", "message": "No active payment intent to capture", "details": {}}},
            )

        # R-03: atomic slot re-assertion — verify the slot is still ours
        if order["slot_id"] and order["day"] and order["slot"]:
            cur.execute(
                """
                SELECT cs.order_id
                FROM capacity_slots cs
                WHERE cs.day = %s AND cs.slot = %s
                FOR UPDATE
                """,
                (order["day"], order["slot"]),
            )
            slot_row = cur.fetchone()
            if slot_row is None or str(slot_row["order_id"]) != order_id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={"error": {"code": "SLOT_TAKEN", "message": "Slot has been rebooked — cannot capture. Reschedule the order first.", "details": {}}},
                )
            # Promote tentative → confirmed
            cur.execute(
                """
                UPDATE capacity_slots
                SET hold_type = 'confirmed', soft_hold_expires_at = NULL
                WHERE day = %s AND slot = %s AND order_id = %s
                """,
                (order["day"], order["slot"], order_id),
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"error": {"code": "NO_SLOT", "message": "Order has no assigned slot — reschedule first", "details": {}}},
            )

        conn.commit()

    # Stripe capture (outside transaction — R-01)
    try:
        stripe.PaymentIntent.capture(order["stripe_payment_intent_id"])
    except stripe.StripeError as e:
        logger.error("Stripe capture failed for order %s: %s", order_id, e)
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={"error": {"code": "CAPTURE_FAILED", "message": "Payment capture failed — the hold may have expired.", "details": {}}},
        )

    # TXN: update order status
    new_status = transition(current, OrderStatus.CAPTURED)
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            "UPDATE orders SET status = %s WHERE id = %s",
            (new_status.value, order_id),
        )
        cur.execute(
            """
            INSERT INTO order_events (order_id, admin_user_id, event_type, detail)
            VALUES (%s, %s, 'captured', %s)
            """,
            (
                order_id,
                admin.uid,
                psycopg2.extras.Json({
                    "amount_cents": order["amount_cents"],
                    "stripe_pi": order["stripe_payment_intent_id"],
                    "prior_status": current.value,
                }),
            ),
        )
        conn.commit()

    return {"status": "captured", "order_id": order_id, "order_number": order["order_number"]}


async def _action_cancel(order_id: str, admin: AdminPrincipal):
    """Cancel: void active PI, scoped slot delete (R-26)."""
    with get_conn() as conn:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cur.execute(
            "SELECT id, status, stripe_payment_intent_id, order_number FROM orders WHERE id = %s FOR UPDATE",
            (order_id,),
        )
        order = cur.fetchone()
        if not order:
            raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Order not found", "details": {}}})

        current = OrderStatus(order["status"])
        try:
            new_status = transition(current, OrderStatus.CANCELLED)
        except InvalidTransitionError:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"error": {"code": "INVALID_STATE", "message": f"Cannot cancel order in '{current.value}' state", "details": {}}},
            )

        # Void Stripe PI if active
        prior_pi = order["stripe_payment_intent_id"]
        if prior_pi:
            try:
                stripe.PaymentIntent.cancel(prior_pi)
            except stripe.StripeError as e:
                logger.warning("Stripe cancel for order %s failed (may already be voided): %s", order_id, e)

        # R-26: scoped delete — only delete the slot belonging to THIS order
        release_slot(conn, order_id)
        cur.execute("UPDATE orders SET slot_id = NULL WHERE id = %s", (order_id,))

        cur.execute(
            "UPDATE orders SET status = %s WHERE id = %s",
            (new_status.value, order_id),
        )
        cur.execute(
            """
            INSERT INTO order_events (order_id, admin_user_id, event_type, detail)
            VALUES (%s, %s, 'cancelled', %s)
            """,
            (
                order_id,
                admin.uid,
                psycopg2.extras.Json({
                    "prior_status": current.value,
                    "prior_pi": prior_pi,
                    "reason": "admin_cancel",
                }),
            ),
        )
        conn.commit()

    return {"status": "cancelled", "order_id": order_id, "order_number": order["order_number"]}


async def _action_extend(order_id: str, admin: AdminPrincipal):
    """Extend: email customer a re-auth link (Option B). Does NOT void PI yet."""
    with get_conn() as conn:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cur.execute(
            "SELECT id, status, stripe_payment_intent_id, customer_email, customer_name, amount_cents, order_number FROM orders WHERE id = %s",
            (order_id,),
        )
        order = cur.fetchone()
        if not order:
            raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Order not found", "details": {}}})

        current = OrderStatus(order["status"])
        if current != OrderStatus.AUTHORIZED:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"error": {"code": "INVALID_STATE", "message": f"Can only extend orders in 'authorized' state, not '{current.value}'", "details": {}}},
            )

        token = generate_reauth_token(order_id)
        reauth_url = f"/book/reauth?order_id={order_id}&token={token}"

        cur.execute(
            """
            INSERT INTO outbox_emails (to_email, template, payload, status)
            VALUES (%s, 'reauth_link', %s, 'pending')
            """,
            (
                order["customer_email"],
                psycopg2.extras.Json({
                    "customer_name": order["customer_name"],
                    "amount_cents": order["amount_cents"],
                    "order_number": order["order_number"],
                    "reauth_url": reauth_url,
                }),
            ),
        )
        cur.execute(
            """
            INSERT INTO order_events (order_id, admin_user_id, event_type, detail)
            VALUES (%s, %s, 'reauthorized_same', %s)
            """,
            (
                order_id,
                admin.uid,
                psycopg2.extras.Json({
                    "action": "extend_link_sent",
                    "active_pi": order["stripe_payment_intent_id"],
                    "amount_cents": order["amount_cents"],
                }),
            ),
        )
        conn.commit()

    return {
        "status": "extend_link_sent",
        "order_id": order_id,
        "order_number": order["order_number"],
        "message": "Re-authorization link has been emailed to the customer.",
    }


# --- Reschedule (F-020, R-28, R-24) ---


class RescheduleRequest(BaseModel):
    new_date: date
    new_slot: str = Field(pattern=r"^(am|pm)$")


@router.post("/orders/{order_id}/reschedule")
async def reschedule_order(
    order_id: str,
    body: RescheduleRequest,
    admin: AdminPrincipal = Depends(get_current_admin),
):
    """Reschedule an order to a new slot at the same amount (R-28)."""
    with get_conn() as conn:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cur.execute(
            """
            SELECT o.id, o.status, o.amount_cents, o.urgency_tier,
                   o.order_number, o.customer_email, o.customer_name,
                   o.service_type_id, o.slot_id,
                   cs.day AS old_day, cs.slot AS old_slot,
                   st.pricing_model
            FROM orders o
            LEFT JOIN capacity_slots cs ON cs.id = o.slot_id
            LEFT JOIN service_types st ON st.id = o.service_type_id
            WHERE o.id = %s
            FOR UPDATE OF o
            """,
            (order_id,),
        )
        order = cur.fetchone()
        if not order:
            raise HTTPException(status_code=404, detail={"error": {"code": "NOT_FOUND", "message": "Order not found", "details": {}}})

        current = OrderStatus(order["status"])
        reschedule_allowed = {
            OrderStatus.AUTHORIZED, OrderStatus.CONFIRMED_SCHEDULED,
            OrderStatus.NEEDS_RESLOT, OrderStatus.RESCHEDULED,
        }
        if current not in reschedule_allowed:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"error": {"code": "INVALID_STATE", "message": f"Cannot reschedule order in '{current.value}' state", "details": {}}},
            )

        # Release old slot if present
        if order["slot_id"]:
            release_slot(conn, order_id)
            cur.execute("UPDATE orders SET slot_id = NULL WHERE id = %s", (order_id,))

        # Reserve new slot
        hold_type = "confirmed" if current == OrderStatus.CAPTURED else "tentative"
        try:
            new_slot = reserve_slot(conn, body.new_date, body.new_slot, order_id, hold_type)
        except SlotTakenError:
            conn.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"error": {"code": "SLOT_TAKEN", "message": "That time is already booked.", "details": {}}},
            )
        except WeatherBlockedError:
            conn.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"error": {"code": "WEATHER_BLOCKED", "message": "That slot is currently blocked due to weather.", "details": {}}},
            )

        # R-24: tier delta logging
        tier_delta_detail: dict[str, Any] = {
            "old_day": str(order["old_day"]) if order["old_day"] else None,
            "old_slot": order["old_slot"],
            "new_day": str(body.new_date),
            "new_slot": body.new_slot,
            "amount_cents": order["amount_cents"],
            "urgency_tier": order["urgency_tier"],
        }

        if order["urgency_tier"] and order["pricing_model"]:
            from app.services.pricing import URGENCY_TIERS
            current_tier = order["urgency_tier"]
            tier_idx = URGENCY_TIERS.index(current_tier) if current_tier in URGENCY_TIERS else -1
            tier_delta_detail["premium_moved_to_lower"] = tier_idx == 0
            tier_delta_detail["original_tier"] = current_tier

        # Determine new status
        if current == OrderStatus.NEEDS_RESLOT:
            new_status = transition(current, OrderStatus.CONFIRMED_SCHEDULED)
        elif current == OrderStatus.RESCHEDULED:
            new_status = transition(current, OrderStatus.CONFIRMED_SCHEDULED)
        else:
            new_status = OrderStatus.RESCHEDULED

        cur.execute(
            "UPDATE orders SET slot_id = %s, status = %s WHERE id = %s",
            (new_slot.slot_id, new_status.value, order_id),
        )
        cur.execute(
            """
            INSERT INTO order_events (order_id, admin_user_id, event_type, detail)
            VALUES (%s, %s, 'rescheduled', %s)
            """,
            (
                order_id,
                admin.uid,
                psycopg2.extras.Json(tier_delta_detail),
            ),
        )

        # Outbox notification
        cur.execute(
            """
            INSERT INTO outbox_emails (to_email, template, payload, status)
            VALUES (%s, 'order_rescheduled', %s, 'pending')
            """,
            (
                order["customer_email"],
                psycopg2.extras.Json({
                    "customer_name": order["customer_name"],
                    "order_number": order["order_number"],
                    "new_date": str(body.new_date),
                    "new_slot": body.new_slot,
                }),
            ),
        )

        conn.commit()

    return {
        "status": new_status.value,
        "order_id": order_id,
        "order_number": order["order_number"],
        "new_day": str(body.new_date),
        "new_slot": body.new_slot,
    }


# --- Photo Serve (R-11: JWT-authenticated, never static) ---


@router.get("/estimates/{estimate_id}/photos/{photo_index}")
async def serve_estimate_photo(
    estimate_id: str,
    photo_index: int,
    admin: AdminPrincipal = Depends(get_current_admin),
):
    """Serve a single estimate photo through the auth'd admin endpoint (R-11)."""
    with get_conn() as conn:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(
            """
            SELECT file_path
            FROM estimate_photos
            WHERE estimate_id = %s
            ORDER BY created_at
            OFFSET %s LIMIT 1
            """,
            (estimate_id, photo_index),
        )
        row = cur.fetchone()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "PHOTO_NOT_FOUND", "message": "Photo unavailable", "details": {}}},
        )

    data = read_photo(row["file_path"])
    if data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "PHOTO_NOT_FOUND", "message": "Photo unavailable", "details": {}}},
        )

    return Response(content=data, media_type="image/jpeg")
