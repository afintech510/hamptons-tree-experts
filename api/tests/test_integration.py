"""Integration tests requiring a live PostgreSQL database.

Covers the concurrent-oversell invariant (O-004), inline expiry (R-16),
weather-block enforcement (R-15), and the reserve-then-charge slot
reservation pattern.

Run with: TEST_DATABASE_URL=postgresql://... pytest -m integration
"""

from __future__ import annotations

import threading
from datetime import date, datetime, timedelta

import psycopg2
import psycopg2.extras
import pytest

from app.config import BUSINESS_TZ
from app.services.capacity import (
    SlotTakenError,
    WeatherBlockedError,
    reserve_slot,
    release_slot,
)


pytestmark = pytest.mark.integration

TEST_DAY = date(2099, 1, 15)


def _make_order(conn, suffix: str) -> str:
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(
        """
        INSERT INTO orders (order_number, fulfillment_type, customer_email,
                            customer_phone, customer_name, service_address)
        VALUES (%s, 'bin_immediate', 'test@test.com', '5551234567', 'Test', '123 Main')
        RETURNING id
        """,
        (f"HTE-TEST{suffix}",),
    )
    row = cur.fetchone()
    return str(row["id"])


class TestConcurrentOversell:
    """O-004: two simultaneous bookings for the last slot -> exactly one
    201, one 409. The UNIQUE(day,slot) constraint is the structural guarantee.
    """

    def test_two_concurrent_bookings_exactly_one_wins(self, integration_schema):
        conn = integration_schema
        order_a = _make_order(conn, "A001")
        order_b = _make_order(conn, "B001")
        conn.commit()

        results = {"a": None, "b": None}
        barrier = threading.Barrier(2, timeout=5)

        def book(conn_dsn, order_id, key):
            c = psycopg2.connect(conn_dsn)
            try:
                barrier.wait()
                try:
                    reserve_slot(c, TEST_DAY, "am", order_id, "confirmed")
                    c.commit()
                    results[key] = "success"
                except (SlotTakenError, psycopg2.errors.UniqueViolation):
                    c.rollback()
                    results[key] = "conflict"
            finally:
                c.close()

        dsn = conn.dsn if hasattr(conn, "dsn") else conn.info.dsn
        t1 = threading.Thread(target=book, args=(dsn, order_a, "a"))
        t2 = threading.Thread(target=book, args=(dsn, order_b, "b"))
        t1.start()
        t2.start()
        t1.join(timeout=10)
        t2.join(timeout=10)

        outcomes = sorted(results.values())
        assert outcomes == ["conflict", "success"], (
            f"Expected exactly one success and one conflict, got: {results}"
        )

    def test_both_slots_can_be_booked_independently(self, integration_schema):
        conn = integration_schema
        order_am = _make_order(conn, "AM01")
        order_pm = _make_order(conn, "PM01")
        conn.commit()

        slot_am = reserve_slot(conn, TEST_DAY, "am", order_am, "confirmed")
        slot_pm = reserve_slot(conn, TEST_DAY, "pm", order_pm, "confirmed")
        conn.commit()

        assert slot_am.slot == "am"
        assert slot_pm.slot == "pm"


class TestInlineExpiry:
    """R-16: an expired tentative hold does NOT cause a false 409."""

    def test_expired_tentative_reclaimed_by_new_booking(self, integration_schema):
        conn = integration_schema
        order_old = _make_order(conn, "OLD1")
        order_new = _make_order(conn, "NEW1")
        conn.commit()

        reserve_slot(conn, TEST_DAY, "am", order_old, "tentative")
        conn.commit()

        cur = conn.cursor()
        cur.execute(
            "UPDATE capacity_slots SET soft_hold_expires_at = now() - interval '1 hour' "
            "WHERE order_id = %s",
            (order_old,),
        )
        conn.commit()

        slot = reserve_slot(conn, TEST_DAY, "am", order_new, "confirmed")
        conn.commit()

        assert slot.slot == "am"
        assert slot.hold_type == "confirmed"

        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(
            "SELECT order_id, hold_type FROM capacity_slots WHERE day = %s AND slot = 'am'",
            (TEST_DAY,),
        )
        row = cur.fetchone()
        assert str(row["order_id"]) == order_new

    def test_live_tentative_blocks_new_booking(self, integration_schema):
        conn = integration_schema
        order_existing = _make_order(conn, "EX01")
        order_new = _make_order(conn, "NW01")
        conn.commit()

        reserve_slot(conn, TEST_DAY, "am", order_existing, "tentative")
        conn.commit()

        with pytest.raises(SlotTakenError):
            reserve_slot(conn, TEST_DAY, "am", order_new, "confirmed")

    def test_confirmed_slot_blocks_even_with_null_expiry(self, integration_schema):
        conn = integration_schema
        order_existing = _make_order(conn, "CF01")
        order_new = _make_order(conn, "NW02")
        conn.commit()

        reserve_slot(conn, TEST_DAY, "am", order_existing, "confirmed")
        conn.commit()

        with pytest.raises(SlotTakenError):
            reserve_slot(conn, TEST_DAY, "am", order_new, "confirmed")


class TestWeatherBlock:
    """R-15: weather-blocked half rejects new bookings via FOR UPDATE check."""

    def test_blocked_am_rejects_booking(self, integration_schema):
        conn = integration_schema
        order_id = _make_order(conn, "WB01")
        conn.commit()

        cur = conn.cursor()
        cur.execute(
            "INSERT INTO capacity_days (day, am_blocked) VALUES (%s, true) "
            "ON CONFLICT (day) DO UPDATE SET am_blocked = true",
            (TEST_DAY,),
        )
        conn.commit()

        with pytest.raises(WeatherBlockedError):
            reserve_slot(conn, TEST_DAY, "am", order_id, "confirmed")

    def test_blocked_pm_allows_am(self, integration_schema):
        conn = integration_schema
        order_id = _make_order(conn, "WB02")
        conn.commit()

        cur = conn.cursor()
        cur.execute(
            "INSERT INTO capacity_days (day, pm_blocked) VALUES (%s, true) "
            "ON CONFLICT (day) DO UPDATE SET pm_blocked = true",
            (TEST_DAY,),
        )
        conn.commit()

        slot = reserve_slot(conn, TEST_DAY, "am", order_id, "confirmed")
        conn.commit()
        assert slot.slot == "am"

    def test_unblocked_allows_booking(self, integration_schema):
        conn = integration_schema
        order_id = _make_order(conn, "WB03")
        conn.commit()

        slot = reserve_slot(conn, TEST_DAY, "am", order_id, "confirmed")
        conn.commit()
        assert slot.slot == "am"


class TestCaptureReassertionR03:
    """R-03: after a tentative hold expires and the slot is rebooked by a BIN
    order, the original order CANNOT reclaim the slot. This is the DB-level
    guarantee that the admin capture path's atomic slot re-assertion relies on.
    """

    def test_cannot_rebook_after_slot_reclaimed(self, integration_schema):
        """Expired tentative hold reclaimed by order B → order A cannot
        re-reserve the slot (capture re-assertion would fail here)."""
        conn = integration_schema
        order_a = _make_order(conn, "R03A")
        order_b = _make_order(conn, "R03B")
        conn.commit()

        reserve_slot(conn, TEST_DAY, "pm", order_a, "tentative")
        conn.commit()

        cur = conn.cursor()
        cur.execute(
            "UPDATE capacity_slots SET soft_hold_expires_at = now() - interval '1 hour' "
            "WHERE order_id = %s",
            (order_a,),
        )
        conn.commit()

        slot = reserve_slot(conn, TEST_DAY, "pm", order_b, "confirmed")
        conn.commit()
        assert slot.hold_type == "confirmed"

        with pytest.raises(SlotTakenError):
            reserve_slot(conn, TEST_DAY, "pm", order_a, "confirmed")

    def test_slot_ownership_after_rebook(self, integration_schema):
        """After rebook, the slot's order_id is order B — this is what the
        capture path's SELECT ... FOR UPDATE checks before allowing capture."""
        conn = integration_schema
        order_a = _make_order(conn, "R03C")
        order_b = _make_order(conn, "R03D")
        conn.commit()

        reserve_slot(conn, TEST_DAY, "pm", order_a, "tentative")
        conn.commit()

        cur = conn.cursor()
        cur.execute(
            "UPDATE capacity_slots SET soft_hold_expires_at = now() - interval '1 hour' "
            "WHERE order_id = %s",
            (order_a,),
        )
        conn.commit()

        reserve_slot(conn, TEST_DAY, "pm", order_b, "confirmed")
        conn.commit()

        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(
            "SELECT order_id, hold_type FROM capacity_slots "
            "WHERE day = %s AND slot = 'pm'",
            (TEST_DAY,),
        )
        row = cur.fetchone()
        assert str(row["order_id"]) == order_b
        assert row["hold_type"] == "confirmed"


class TestSlotRelease:
    """R-01 compensating release: release_slot frees a specific order's slot."""

    def test_release_frees_slot_for_rebooking(self, integration_schema):
        conn = integration_schema
        order_a = _make_order(conn, "RA01")
        order_b = _make_order(conn, "RB01")
        conn.commit()

        reserve_slot(conn, TEST_DAY, "am", order_a, "confirmed")
        conn.commit()

        released = release_slot(conn, order_a)
        conn.commit()
        assert released is True

        slot = reserve_slot(conn, TEST_DAY, "am", order_b, "confirmed")
        conn.commit()
        assert slot.slot == "am"

    def test_release_nonexistent_returns_false(self, integration_schema):
        conn = integration_schema
        released = release_slot(conn, "00000000-0000-0000-0000-000000000099")
        assert released is False
