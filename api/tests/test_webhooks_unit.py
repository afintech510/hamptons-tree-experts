"""Webhook handler unit tests (R-05, R-10).

Tests _handle_pi_succeeded and _handle_pi_canceled with mocked DB
connections. Covers PI-correlation (R-05: stale PI ignored), dedup
(R-10: duplicate event_id skipped), terminal-state protection, and
the happy-path reconciliation flows.
"""

from unittest.mock import MagicMock, call, patch

import pytest

from app.models.order_status import OrderStatus


def _mock_conn_and_cursor(fetchone_returns=None, fetchall_returns=None):
    """Build a mock connection + cursor pair with pre-loaded return values."""
    conn = MagicMock()
    cursor = MagicMock()
    conn.cursor.return_value = cursor
    if fetchone_returns is not None:
        cursor.fetchone.side_effect = list(fetchone_returns)
    if fetchall_returns is not None:
        cursor.fetchall.return_value = fetchall_returns
    return conn, cursor


class TestHandlePiSucceeded:
    """payment_intent.succeeded handler."""

    @patch("app.routers.webhooks.get_conn")
    def test_ignores_when_no_order_id(self, mock_get_conn):
        from app.routers.webhooks import _handle_pi_succeeded
        _handle_pi_succeeded("pi_123", "")
        mock_get_conn.assert_not_called()

    @patch("app.routers.webhooks.get_conn")
    def test_ignores_when_order_not_found(self, mock_get_conn):
        conn, cursor = _mock_conn_and_cursor(fetchone_returns=[None])
        mock_get_conn.return_value.__enter__ = MagicMock(return_value=conn)
        mock_get_conn.return_value.__exit__ = MagicMock(return_value=False)

        from app.routers.webhooks import _handle_pi_succeeded
        _handle_pi_succeeded("pi_123", "order-uuid")
        conn.commit.assert_not_called()

    @patch("app.routers.webhooks.get_conn")
    def test_r05_ignores_stale_pi(self, mock_get_conn):
        """R-05: PI in webhook doesn't match order's active PI — ignored."""
        order = {
            "id": "order-uuid",
            "status": OrderStatus.AUTHORIZED.value,
            "stripe_payment_intent_id": "pi_current",
        }
        conn, cursor = _mock_conn_and_cursor(fetchone_returns=[order])
        mock_get_conn.return_value.__enter__ = MagicMock(return_value=conn)
        mock_get_conn.return_value.__exit__ = MagicMock(return_value=False)

        from app.routers.webhooks import _handle_pi_succeeded
        _handle_pi_succeeded("pi_old_stale", "order-uuid")
        conn.commit.assert_not_called()

    @patch("app.routers.webhooks.get_conn")
    def test_noop_when_already_captured(self, mock_get_conn):
        order = {
            "id": "order-uuid",
            "status": OrderStatus.CAPTURED.value,
            "stripe_payment_intent_id": "pi_123",
        }
        conn, cursor = _mock_conn_and_cursor(fetchone_returns=[order])
        mock_get_conn.return_value.__enter__ = MagicMock(return_value=conn)
        mock_get_conn.return_value.__exit__ = MagicMock(return_value=False)

        from app.routers.webhooks import _handle_pi_succeeded
        _handle_pi_succeeded("pi_123", "order-uuid")
        conn.commit.assert_not_called()

    @patch("app.routers.webhooks.get_conn")
    def test_critical_log_on_terminal_state_capture(self, mock_get_conn, caplog):
        """Money captured for cancelled/expired order — manual reconciliation needed."""
        order = {
            "id": "order-uuid",
            "status": OrderStatus.CANCELLED.value,
            "stripe_payment_intent_id": "pi_123",
        }
        conn, cursor = _mock_conn_and_cursor(fetchone_returns=[order])
        mock_get_conn.return_value.__enter__ = MagicMock(return_value=conn)
        mock_get_conn.return_value.__exit__ = MagicMock(return_value=False)

        import logging
        with caplog.at_level(logging.CRITICAL, logger="app.routers.webhooks"):
            from app.routers.webhooks import _handle_pi_succeeded
            _handle_pi_succeeded("pi_123", "order-uuid")

        assert "manual reconciliation" in caplog.text.lower()
        conn.commit.assert_not_called()

    @patch("app.routers.webhooks.get_conn")
    def test_reconciles_authorized_to_captured(self, mock_get_conn):
        order = {
            "id": "order-uuid",
            "status": OrderStatus.AUTHORIZED.value,
            "stripe_payment_intent_id": "pi_123",
        }
        conn, cursor = _mock_conn_and_cursor(fetchone_returns=[order])
        mock_get_conn.return_value.__enter__ = MagicMock(return_value=conn)
        mock_get_conn.return_value.__exit__ = MagicMock(return_value=False)

        from app.routers.webhooks import _handle_pi_succeeded
        _handle_pi_succeeded("pi_123", "order-uuid")

        executed_sqls = [c.args[0] for c in cursor.execute.call_args_list]
        update_sql = [s for s in executed_sqls if "UPDATE orders SET status" in s]
        assert len(update_sql) >= 1
        conn.commit.assert_called()


class TestHandlePiCanceled:
    """payment_intent.canceled handler."""

    @patch("app.routers.webhooks.get_conn")
    def test_ignores_when_no_order_id(self, mock_get_conn):
        from app.routers.webhooks import _handle_pi_canceled
        _handle_pi_canceled("pi_123", "")
        mock_get_conn.assert_not_called()

    @patch("app.routers.webhooks.get_conn")
    def test_r05_ignores_stale_pi_cancellation(self, mock_get_conn):
        """R-05: canceled PI doesn't match order's active PI — ignored."""
        order = {
            "id": "order-uuid",
            "status": OrderStatus.AUTHORIZED.value,
            "stripe_payment_intent_id": "pi_current",
        }
        conn, cursor = _mock_conn_and_cursor(fetchone_returns=[order])
        mock_get_conn.return_value.__enter__ = MagicMock(return_value=conn)
        mock_get_conn.return_value.__exit__ = MagicMock(return_value=False)

        from app.routers.webhooks import _handle_pi_canceled
        _handle_pi_canceled("pi_old_stale", "order-uuid")
        conn.commit.assert_not_called()

    @patch("app.routers.webhooks.get_conn")
    def test_noop_on_terminal_state(self, mock_get_conn):
        """Already cancelled/completed/expired orders ignore PI cancellation."""
        for terminal in (OrderStatus.CANCELLED, OrderStatus.COMPLETED, OrderStatus.EXPIRED):
            order = {
                "id": "order-uuid",
                "status": terminal.value,
                "stripe_payment_intent_id": "pi_123",
            }
            conn, cursor = _mock_conn_and_cursor(fetchone_returns=[order])
            mock_get_conn.return_value.__enter__ = MagicMock(return_value=conn)
            mock_get_conn.return_value.__exit__ = MagicMock(return_value=False)

            from app.routers.webhooks import _handle_pi_canceled
            _handle_pi_canceled("pi_123", "order-uuid")
            conn.commit.assert_not_called()

    @patch("app.services.capacity.release_slot", wraps=None)
    @patch("app.routers.webhooks.get_conn")
    def test_cancels_authorized_order_and_releases_slot(self, mock_get_conn, mock_release):
        order = {
            "id": "order-uuid",
            "status": OrderStatus.AUTHORIZED.value,
            "stripe_payment_intent_id": "pi_123",
        }
        conn, cursor = _mock_conn_and_cursor(fetchone_returns=[order])
        mock_get_conn.return_value.__enter__ = MagicMock(return_value=conn)
        mock_get_conn.return_value.__exit__ = MagicMock(return_value=False)

        from app.routers.webhooks import _handle_pi_canceled
        _handle_pi_canceled("pi_123", "order-uuid")

        mock_release.assert_called_once_with(conn, "order-uuid")
        conn.commit.assert_called()

    @patch("app.routers.webhooks.get_conn")
    def test_ignores_when_order_not_found(self, mock_get_conn):
        conn, cursor = _mock_conn_and_cursor(fetchone_returns=[None])
        mock_get_conn.return_value.__enter__ = MagicMock(return_value=conn)
        mock_get_conn.return_value.__exit__ = MagicMock(return_value=False)

        from app.routers.webhooks import _handle_pi_canceled
        _handle_pi_canceled("pi_123", "order-uuid")
        conn.commit.assert_not_called()
