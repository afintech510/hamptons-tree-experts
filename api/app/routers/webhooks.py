"""Stripe webhook handler (spec §3.3, R-05, R-10).

Routed directly to FastAPI (bypassing Next.js proxy) so the raw body
reaches signature verification untouched (R-18).
"""

from __future__ import annotations

import logging

import psycopg2.extras
import stripe
from fastapi import APIRouter, HTTPException, Request, status

from app.config import settings
from app.db import get_conn
from app.models.order_status import InvalidTransitionError, OrderStatus, transition

logger = logging.getLogger(__name__)

router = APIRouter(tags=["webhooks"])

stripe.api_key = settings.stripe_secret_key


@router.post("/api/v1/webhooks/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(
            body, sig, settings.stripe_webhook_secret
        )
    except stripe.SignatureVerificationError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "INVALID_SIGNATURE", "message": "Invalid webhook signature", "details": {}}},
        )

    event_id = event["id"]
    event_type = event["type"]

    # R-10: dedup on event id via processed_webhooks
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO processed_webhooks (event_id) VALUES (%s) ON CONFLICT (event_id) DO NOTHING RETURNING event_id",
            (event_id,),
        )
        inserted = cur.fetchone()
        conn.commit()

        if inserted is None:
            logger.info("webhook: duplicate event %s, skipping", event_id)
            return {"received": True}

    pi = event.get("data", {}).get("object", {})
    pi_id = pi.get("id", "")
    order_id = pi.get("metadata", {}).get("order_id", "")

    if event_type == "payment_intent.succeeded":
        _handle_pi_succeeded(pi_id, order_id)
    elif event_type == "payment_intent.canceled":
        _handle_pi_canceled(pi_id, order_id)
    else:
        logger.info("webhook: unhandled event type %s", event_type)

    return {"received": True}


def _handle_pi_succeeded(pi_id: str, order_id: str) -> None:
    """Reconcile a successful capture — handles the R-01 ambiguous-response case."""
    if not order_id:
        logger.warning("webhook: payment_intent.succeeded with no order_id in metadata")
        return

    with get_conn() as conn:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cur.execute(
            "SELECT id, status, stripe_payment_intent_id FROM orders WHERE id = %s",
            (order_id,),
        )
        order = cur.fetchone()
        if not order:
            logger.warning("webhook: order %s not found for PI %s", order_id, pi_id)
            return

        # R-05: only act if this PI matches the order's currently active PI
        if order["stripe_payment_intent_id"] and order["stripe_payment_intent_id"] != pi_id:
            logger.info(
                "webhook: PI %s does not match active PI %s for order %s, ignoring",
                pi_id, order["stripe_payment_intent_id"], order_id,
            )
            return

        current = OrderStatus(order["status"])

        if current == OrderStatus.CAPTURED:
            logger.info("webhook: order %s already captured, no-op", order_id)
            return

        if current in (OrderStatus.CANCELLED, OrderStatus.EXPIRED):
            logger.critical(
                "webhook: payment_intent.succeeded for %s order %s (PI %s) — "
                "money was captured but order is terminal. Manual reconciliation required.",
                current.value, order_id, pi_id,
            )
            return

        try:
            new_status = transition(current, OrderStatus.CAPTURED)
        except InvalidTransitionError:
            logger.warning(
                "webhook: cannot transition order %s from %s to captured", order_id, current.value,
            )
            return

        cur.execute(
            """
            UPDATE orders SET status = %s, stripe_payment_intent_id = %s
            WHERE id = %s
            """,
            (new_status.value, pi_id, order_id),
        )
        cur.execute(
            """
            INSERT INTO order_events (order_id, event_type, detail)
            VALUES (%s, 'captured', %s)
            """,
            (
                order_id,
                psycopg2.extras.Json({
                    "source": "webhook_reconciliation",
                    "stripe_pi": pi_id,
                }),
            ),
        )
        conn.commit()
        logger.info("webhook: reconciled order %s to captured via PI %s", order_id, pi_id)


def _handle_pi_canceled(pi_id: str, order_id: str) -> None:
    """Handle a PI cancellation — only if it matches the active PI (R-05)."""
    if not order_id:
        return

    with get_conn() as conn:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cur.execute(
            "SELECT id, status, stripe_payment_intent_id FROM orders WHERE id = %s",
            (order_id,),
        )
        order = cur.fetchone()
        if not order:
            return

        # R-05: ignore cancellation of a superseded PI
        if order["stripe_payment_intent_id"] != pi_id:
            logger.info(
                "webhook: canceled PI %s does not match active PI %s for order %s, ignoring (R-05)",
                pi_id, order["stripe_payment_intent_id"], order_id,
            )
            return

        current = OrderStatus(order["status"])
        if current in (OrderStatus.CANCELLED, OrderStatus.COMPLETED, OrderStatus.EXPIRED):
            return

        try:
            new_status = transition(current, OrderStatus.CANCELLED)
        except InvalidTransitionError:
            logger.warning(
                "webhook: cannot transition order %s from %s to cancelled", order_id, current.value,
            )
            return

        cur.execute(
            "UPDATE orders SET status = %s WHERE id = %s",
            (new_status.value, order_id),
        )

        from app.services.capacity import release_slot
        release_slot(conn, order_id)
        cur.execute("UPDATE orders SET slot_id = NULL WHERE id = %s", (order_id,))

        cur.execute(
            """
            INSERT INTO order_events (order_id, event_type, detail)
            VALUES (%s, 'cancelled', %s)
            """,
            (
                order_id,
                psycopg2.extras.Json({
                    "source": "webhook",
                    "stripe_pi": pi_id,
                    "reason": "payment_intent.canceled",
                }),
            ),
        )
        conn.commit()
        logger.info("webhook: cancelled order %s via PI %s", order_id, pi_id)
