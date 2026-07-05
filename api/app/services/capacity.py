"""Capacity system (spec §2.2, R-14/R-15/R-16).

One crew, 2 shared slots/day (AM/PM). The ``UNIQUE(day,slot)`` DB constraint
is the structural oversell guarantee (O-004). This module implements the
transactional reservation patterns that work with it:

- Lazy day materialization (R-14): upsert capacity_days before inserting a slot
- Weather-block enforcement (R-15): SELECT ... FOR UPDATE on the day row,
  reject if the relevant half is blocked
- Inline expiry to avoid false 409s (R-16): INSERT ... ON CONFLICT ... DO UPDATE
  WHERE soft_hold_expires_at < now() so expired tentative holds are reclaimed
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Any

import psycopg2
import psycopg2.extras

from app.config import BUSINESS_TZ

SOFT_HOLD_DURATION_HOURS = 48


@dataclass(frozen=True)
class SlotReservation:
    slot_id: str
    day: date
    slot: str
    hold_type: str


class SlotTakenError(Exception):
    pass


class WeatherBlockedError(Exception):
    pass


def reserve_slot(
    conn: Any,
    day: date,
    slot: str,
    order_id: str,
    hold_type: str = "confirmed",
) -> SlotReservation:
    """Reserve a capacity slot within an existing transaction.

    The caller MUST manage the transaction boundary (commit/rollback).
    This function does not commit.
    """
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # R-14: lazy day materialization
    cur.execute(
        "INSERT INTO capacity_days (day) VALUES (%s) ON CONFLICT (day) DO NOTHING",
        (day,),
    )

    # R-15: weather-block enforcement — lock the day row and check
    cur.execute(
        "SELECT am_blocked, pm_blocked FROM capacity_days WHERE day = %s FOR UPDATE",
        (day,),
    )
    day_row = cur.fetchone()
    if day_row is None:
        raise SlotTakenError("Day does not exist")

    blocked_col = "am_blocked" if slot == "am" else "pm_blocked"
    if day_row[blocked_col]:
        raise WeatherBlockedError(f"{slot.upper()} slot on {day} is weather-blocked")

    # R-16: inline expiry — reclaim expired tentative holds atomically
    soft_hold_expires = None
    if hold_type == "tentative":
        soft_hold_expires = datetime.now(BUSINESS_TZ) + timedelta(hours=SOFT_HOLD_DURATION_HOURS)

    cur.execute(
        """
        INSERT INTO capacity_slots (day, slot, hold_type, order_id, soft_hold_expires_at)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (day, slot) DO UPDATE SET
            hold_type = EXCLUDED.hold_type,
            order_id = EXCLUDED.order_id,
            soft_hold_expires_at = EXCLUDED.soft_hold_expires_at,
            created_at = now()
        WHERE capacity_slots.soft_hold_expires_at IS NOT NULL
          AND capacity_slots.soft_hold_expires_at < now()
        RETURNING id, day, slot, hold_type
        """,
        (day, slot, hold_type, order_id, soft_hold_expires),
    )
    row = cur.fetchone()
    if row is None:
        raise SlotTakenError(f"{slot.upper()} slot on {day} is already booked")

    return SlotReservation(
        slot_id=str(row["id"]),
        day=row["day"],
        slot=row["slot"],
        hold_type=row["hold_type"],
    )


def release_slot(conn: Any, order_id: str) -> bool:
    """Release a slot held by a specific order (compensating action for R-01).

    Returns True if a slot was released, False if no slot was held.
    """
    cur = conn.cursor()
    cur.execute(
        "DELETE FROM capacity_slots WHERE order_id = %s RETURNING id",
        (order_id,),
    )
    released = cur.fetchone() is not None
    return released


def get_available_slots(conn: Any, day: date) -> dict[str, bool]:
    """Check which slots are available for a given day."""
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cur.execute(
        "SELECT am_blocked, pm_blocked FROM capacity_days WHERE day = %s",
        (day,),
    )
    day_row = cur.fetchone()

    am_blocked = day_row["am_blocked"] if day_row else False
    pm_blocked = day_row["pm_blocked"] if day_row else False

    cur.execute(
        """
        SELECT slot FROM capacity_slots
        WHERE day = %s
          AND (soft_hold_expires_at IS NULL OR soft_hold_expires_at >= now())
        """,
        (day,),
    )
    booked = {row["slot"] for row in cur.fetchall()}

    return {
        "am": not am_blocked and "am" not in booked,
        "pm": not pm_blocked and "pm" not in booked,
    }
