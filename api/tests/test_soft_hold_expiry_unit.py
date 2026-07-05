"""Soft-hold expiry job unit tests (R-03, R-17).

Verifies that the expiry job correctly transitions authorized orders to
needs_reslot (R-03), simply releases non-authorized expired holds, and
uses the advisory lock (R-17).
"""

from unittest.mock import MagicMock, patch

import pytest

from app.models.order_status import OrderStatus


def _mock_conn(advisory_acquired=True, expired_rows=None):
    conn = MagicMock()
    cursor = MagicMock()
    conn.cursor.return_value = cursor

    fetchone_sequence = [{"acquired": advisory_acquired}]
    cursor.fetchone.side_effect = fetchone_sequence
    cursor.fetchall.return_value = expired_rows or []

    return conn, cursor


class TestSoftHoldExpiry:
    @patch("app.jobs.soft_hold_expiry.get_conn")
    def test_skips_when_lock_not_acquired(self, mock_get_conn):
        conn, cursor = _mock_conn(advisory_acquired=False)
        mock_get_conn.return_value.__enter__ = MagicMock(return_value=conn)
        mock_get_conn.return_value.__exit__ = MagicMock(return_value=False)

        from app.jobs.soft_hold_expiry import run_soft_hold_expiry
        result = run_soft_hold_expiry()
        assert result == 0

    @patch("app.jobs.soft_hold_expiry.get_conn")
    def test_no_expired_holds_returns_zero(self, mock_get_conn):
        conn, cursor = _mock_conn(advisory_acquired=True, expired_rows=[])
        mock_get_conn.return_value.__enter__ = MagicMock(return_value=conn)
        mock_get_conn.return_value.__exit__ = MagicMock(return_value=False)

        from app.jobs.soft_hold_expiry import run_soft_hold_expiry
        result = run_soft_hold_expiry()
        assert result == 0

    @patch("app.jobs.soft_hold_expiry.get_conn")
    def test_authorized_order_transitions_to_needs_reslot(self, mock_get_conn):
        """R-03: authorized order with expired hold → needs_reslot, not silent release."""
        expired_row = {
            "slot_id": "slot-uuid",
            "order_id": "order-uuid",
            "day": "2099-01-15",
            "slot": "am",
            "order_status": OrderStatus.AUTHORIZED.value,
        }
        conn, cursor = _mock_conn(advisory_acquired=True, expired_rows=[expired_row])
        mock_get_conn.return_value.__enter__ = MagicMock(return_value=conn)
        mock_get_conn.return_value.__exit__ = MagicMock(return_value=False)

        from app.jobs.soft_hold_expiry import run_soft_hold_expiry
        result = run_soft_hold_expiry()
        assert result == 1

        executed_sqls = [c.args[0] for c in cursor.execute.call_args_list]
        needs_reslot_updates = [
            s for s in executed_sqls
            if "UPDATE orders SET status" in s
        ]
        assert len(needs_reslot_updates) >= 1

        needs_reslot_params = [
            c.args[1] for c in cursor.execute.call_args_list
            if "UPDATE orders SET status" in c.args[0]
        ]
        assert any(OrderStatus.NEEDS_RESLOT.value in str(p) for p in needs_reslot_params)

    @patch("app.jobs.soft_hold_expiry.get_conn")
    def test_non_authorized_order_simple_release(self, mock_get_conn):
        """Non-authorized expired hold → delete slot, don't change order status."""
        expired_row = {
            "slot_id": "slot-uuid",
            "order_id": "order-uuid",
            "day": "2099-01-15",
            "slot": "am",
            "order_status": OrderStatus.PENDING_PAYMENT.value,
        }
        conn, cursor = _mock_conn(advisory_acquired=True, expired_rows=[expired_row])
        mock_get_conn.return_value.__enter__ = MagicMock(return_value=conn)
        mock_get_conn.return_value.__exit__ = MagicMock(return_value=False)

        from app.jobs.soft_hold_expiry import run_soft_hold_expiry
        result = run_soft_hold_expiry()
        assert result == 1

        executed_sqls = [c.args[0] for c in cursor.execute.call_args_list]
        delete_sqls = [s for s in executed_sqls if "DELETE FROM capacity_slots" in s]
        assert len(delete_sqls) >= 1

        needs_reslot_updates = [
            s for s in executed_sqls
            if "needs_reslot" in s.lower()
        ]
        assert len(needs_reslot_updates) == 0

    @patch("app.jobs.soft_hold_expiry.get_conn")
    def test_multiple_expired_holds_processed(self, mock_get_conn):
        rows = [
            {
                "slot_id": f"slot-{i}",
                "order_id": f"order-{i}",
                "day": "2099-01-15",
                "slot": "am" if i % 2 == 0 else "pm",
                "order_status": OrderStatus.AUTHORIZED.value,
            }
            for i in range(3)
        ]
        conn, cursor = _mock_conn(advisory_acquired=True, expired_rows=rows)
        mock_get_conn.return_value.__enter__ = MagicMock(return_value=conn)
        mock_get_conn.return_value.__exit__ = MagicMock(return_value=False)

        from app.jobs.soft_hold_expiry import run_soft_hold_expiry
        result = run_soft_hold_expiry()
        assert result == 3

    @patch("app.jobs.soft_hold_expiry.get_conn")
    def test_records_order_event_for_authorized_expiry(self, mock_get_conn):
        expired_row = {
            "slot_id": "slot-uuid",
            "order_id": "order-uuid",
            "day": "2099-01-15",
            "slot": "am",
            "order_status": OrderStatus.AUTHORIZED.value,
        }
        conn, cursor = _mock_conn(advisory_acquired=True, expired_rows=[expired_row])
        mock_get_conn.return_value.__enter__ = MagicMock(return_value=conn)
        mock_get_conn.return_value.__exit__ = MagicMock(return_value=False)

        from app.jobs.soft_hold_expiry import run_soft_hold_expiry
        run_soft_hold_expiry()

        executed_sqls = [c.args[0] for c in cursor.execute.call_args_list]
        event_inserts = [s for s in executed_sqls if "INSERT INTO order_events" in s]
        assert len(event_inserts) >= 1
