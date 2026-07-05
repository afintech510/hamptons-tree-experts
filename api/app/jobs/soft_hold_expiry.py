"""Soft-hold expiry job (spec §1.3, R-17).

Runs every 15 minutes. Expires tentative capacity holds past their
``soft_hold_expires_at``. For a tentative hold on an ``authorized`` order,
transitions to ``needs_reslot`` rather than silent release (R-03).

Wrapped in ``pg_try_advisory_lock`` so only one instance runs a given tick,
regardless of worker/replica count (R-17).
"""

from __future__ import annotations

import logging

import psycopg2.extras

from app.db import get_conn
from app.models.order_status import OrderStatus, can_transition

logger = logging.getLogger(__name__)

ADVISORY_LOCK_ID = 100001


def run_soft_hold_expiry() -> int:
    """Expire stale tentative holds. Returns the number of slots processed."""
    with get_conn() as conn:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # R-17: advisory lock — only one instance runs
        cur.execute("SELECT pg_try_advisory_lock(%s) AS acquired", (ADVISORY_LOCK_ID,))
        if not cur.fetchone()["acquired"]:
            logger.info("soft_hold_expiry: another instance holds the lock, skipping")
            return 0

        try:
            cur.execute(
                """
                SELECT cs.id AS slot_id, cs.order_id, cs.day, cs.slot,
                       o.status AS order_status
                FROM capacity_slots cs
                JOIN orders o ON o.id = cs.order_id
                WHERE cs.hold_type = 'tentative'
                  AND cs.soft_hold_expires_at < now()
                """
            )
            expired = cur.fetchall()

            count = 0
            for row in expired:
                order_status = row["order_status"]

                if order_status == OrderStatus.AUTHORIZED.value and can_transition(
                    OrderStatus.AUTHORIZED, OrderStatus.NEEDS_RESLOT
                ):
                    # R-03: don't silently release — route to needs_reslot
                    cur.execute(
                        "UPDATE orders SET status = %s WHERE id = %s",
                        (OrderStatus.NEEDS_RESLOT.value, row["order_id"]),
                    )
                    cur.execute(
                        "DELETE FROM capacity_slots WHERE id = %s",
                        (row["slot_id"],),
                    )
                    cur.execute(
                        """
                        UPDATE orders SET slot_id = NULL WHERE id = %s
                        """,
                        (row["order_id"],),
                    )
                    cur.execute(
                        """
                        INSERT INTO order_events (order_id, event_type, detail)
                        VALUES (%s, 'soft_hold_expired', %s)
                        """,
                        (
                            row["order_id"],
                            psycopg2.extras.Json({
                                "expired_slot_day": str(row["day"]),
                                "expired_slot": row["slot"],
                                "previous_status": order_status,
                                "new_status": OrderStatus.NEEDS_RESLOT.value,
                            }),
                        ),
                    )
                    logger.info(
                        "soft_hold_expiry: order %s → needs_reslot (slot %s/%s)",
                        row["order_id"], row["day"], row["slot"],
                    )
                else:
                    # Simple release — order is not in authorized state
                    cur.execute(
                        "DELETE FROM capacity_slots WHERE id = %s",
                        (row["slot_id"],),
                    )
                    cur.execute(
                        "UPDATE orders SET slot_id = NULL WHERE id = %s AND slot_id = %s",
                        (row["order_id"], row["slot_id"]),
                    )
                    logger.info(
                        "soft_hold_expiry: released slot %s/%s (order %s status=%s)",
                        row["day"], row["slot"], row["order_id"], order_status,
                    )

                count += 1

            conn.commit()

            # Record job run for health monitoring (R-31)
            cur.execute(
                """
                INSERT INTO job_runs (job_name, last_success_at)
                VALUES ('soft_hold_expiry', now())
                ON CONFLICT (job_name) DO UPDATE SET last_success_at = now()
                """
            )
            conn.commit()

            logger.info("soft_hold_expiry: processed %d expired holds", count)
            return count
        finally:
            cur.execute("SELECT pg_advisory_unlock(%s)", (ADVISORY_LOCK_ID,))
            conn.commit()
