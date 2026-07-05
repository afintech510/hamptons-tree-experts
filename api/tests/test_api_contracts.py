"""API contract and integration tests (§3.2, R-01, R-09, R-12/R-16).

Tests endpoint response shapes, error envelope format, uniform-404
lookup, idempotency, and rate limiting using FastAPI TestClient with
mocked DB and Stripe dependencies.
"""

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app
from app.models.order_status import OrderStatus

TEST_JWT_SECRET = "test-secret-for-api-contracts"


class _FakeQuery:
    def __init__(self, rows):
        self._rows = rows

    def select(self, *_a, **_k):
        return self

    def eq(self, *_a, **_k):
        return self

    def limit(self, *_a, **_k):
        return self

    def execute(self):
        class _R:
            def __init__(self, data):
                self.data = data
        return _R(self._rows)


class _FakeTable:
    def __init__(self, rows):
        self._rows = rows

    def table(self, _name):
        return _FakeQuery(self._rows)


@pytest.fixture(autouse=True)
def _set_jwt_secret(monkeypatch):
    monkeypatch.setattr(settings, "supabase_jwt_secret", TEST_JWT_SECRET)


@pytest.fixture
def client():
    return TestClient(app)


# --- Error Envelope §3.1 ---


class TestErrorEnvelope:
    """All errors must follow { "error": { "code", "message", "details" } }."""

    def test_401_has_error_envelope(self, client):
        resp = client.get("/api/v1/admin/ping")
        assert resp.status_code == 401
        body = resp.json()
        assert "error" in body
        assert "code" in body["error"]
        assert "message" in body["error"]

    def test_404_on_unknown_route(self, client):
        resp = client.get("/api/v1/nonexistent")
        assert resp.status_code in (404, 405)

    def test_422_on_invalid_body(self, client):
        resp = client.post("/api/v1/orders/bin", json={})
        assert resp.status_code == 422


# --- Uniform 404 — R-12/R-16 ---


class TestUniformLookup:
    """R-12/R-16: order lookup returns identical 404 for both 'not found'
    and 'email mismatch' — no oracle for attackers to enumerate orders.
    """

    @patch("app.routers.orders.get_conn")
    def test_missing_order_returns_404(self, mock_get_conn, client):
        conn = MagicMock()
        cursor = MagicMock()
        conn.cursor.return_value = cursor
        cursor.fetchone.return_value = None
        mock_get_conn.return_value.__enter__ = MagicMock(return_value=conn)
        mock_get_conn.return_value.__exit__ = MagicMock(return_value=False)

        resp = client.get(
            "/api/v1/orders/lookup",
            params={"order_number": "HTE-NOTREAL123", "email": "a@b.com"},
        )
        assert resp.status_code == 404
        body = resp.json()
        assert body["error"]["code"] == "LOOKUP_NOT_FOUND"

    @patch("app.routers.orders.get_conn")
    def test_email_mismatch_returns_same_404(self, mock_get_conn, client):
        """Same 404 shape even when order exists but email doesn't match."""
        row = {
            "order_number": "HTE-ABCD1234EF",
            "status": "captured",
            "amount_cents": 10000,
            "customer_email": "real@example.com",
            "customer_name": "Real Person",
            "service_address": "123 Main",
            "urgency_tier": "6_14_day",
            "created_at": MagicMock(isoformat=lambda: "2026-07-01T12:00:00"),
            "service_name": "Stump Grinding",
            "slot_day": None,
            "slot_time": None,
        }
        conn = MagicMock()
        cursor = MagicMock()
        conn.cursor.return_value = cursor
        cursor.fetchone.return_value = row
        mock_get_conn.return_value.__enter__ = MagicMock(return_value=conn)
        mock_get_conn.return_value.__exit__ = MagicMock(return_value=False)

        resp = client.get(
            "/api/v1/orders/lookup",
            params={"order_number": "HTE-ABCD1234EF", "email": "wrong@evil.com"},
        )
        assert resp.status_code == 404
        body = resp.json()
        assert body["error"]["code"] == "LOOKUP_NOT_FOUND"

    @patch("app.routers.orders.get_conn")
    def test_not_found_and_mismatch_are_indistinguishable(self, mock_get_conn, client):
        """The error body for 'not found' and 'email mismatch' must be identical."""
        # First: order doesn't exist
        conn1 = MagicMock()
        cur1 = MagicMock()
        conn1.cursor.return_value = cur1
        cur1.fetchone.return_value = None
        mock_get_conn.return_value.__enter__ = MagicMock(return_value=conn1)
        mock_get_conn.return_value.__exit__ = MagicMock(return_value=False)

        resp1 = client.get(
            "/api/v1/orders/lookup",
            params={"order_number": "HTE-ZZZZ000000", "email": "a@b.com"},
        )

        # Second: order exists, email wrong
        row = {
            "order_number": "HTE-ABCD1234EF",
            "status": "captured",
            "amount_cents": 10000,
            "customer_email": "real@example.com",
            "customer_name": "Test",
            "service_address": "123 Main",
            "urgency_tier": "6_14_day",
            "created_at": MagicMock(isoformat=lambda: "2026-07-01T12:00:00"),
            "service_name": "Stump Grinding",
            "slot_day": None,
            "slot_time": None,
        }
        conn2 = MagicMock()
        cur2 = MagicMock()
        conn2.cursor.return_value = cur2
        cur2.fetchone.return_value = row
        mock_get_conn.return_value.__enter__ = MagicMock(return_value=conn2)
        mock_get_conn.return_value.__exit__ = MagicMock(return_value=False)

        # Reset rate limiter
        from app.routers.orders import _lookup_rate
        _lookup_rate.clear()

        resp2 = client.get(
            "/api/v1/orders/lookup",
            params={"order_number": "HTE-ABCD1234EF", "email": "wrong@evil.com"},
        )

        assert resp1.status_code == resp2.status_code == 404
        assert resp1.json() == resp2.json()

    @patch("app.routers.orders.get_conn")
    def test_valid_lookup_returns_order_shape(self, mock_get_conn, client):
        """Valid lookup returns the expected fields."""
        row = {
            "order_number": "HTE-ABCD1234EF",
            "status": "captured",
            "amount_cents": 10000,
            "customer_email": "test@example.com",
            "customer_name": "Test Person",
            "service_address": "123 Main St",
            "urgency_tier": "6_14_day",
            "created_at": MagicMock(isoformat=lambda: "2026-07-01T12:00:00"),
            "service_name": "Stump Grinding",
            "slot_day": "2026-07-05",
            "slot_time": "am",
        }
        conn = MagicMock()
        cursor = MagicMock()
        conn.cursor.return_value = cursor
        cursor.fetchone.return_value = row
        mock_get_conn.return_value.__enter__ = MagicMock(return_value=conn)
        mock_get_conn.return_value.__exit__ = MagicMock(return_value=False)

        resp = client.get(
            "/api/v1/orders/lookup",
            params={"order_number": "HTE-ABCD1234EF", "email": "test@example.com"},
        )
        assert resp.status_code == 200
        body = resp.json()
        expected_keys = {"order_number", "status", "amount_cents", "service_name",
                         "urgency_tier", "slot_day", "slot_time", "service_address", "created_at"}
        assert expected_keys <= set(body.keys())


# --- Rate Limiting ---


class TestLookupRateLimit:
    def setup_method(self):
        from app.routers.orders import _lookup_rate
        _lookup_rate.clear()

    @patch("app.routers.orders.get_conn")
    def test_rate_limit_enforced(self, mock_get_conn, client):
        conn = MagicMock()
        cursor = MagicMock()
        conn.cursor.return_value = cursor
        cursor.fetchone.return_value = None
        mock_get_conn.return_value.__enter__ = MagicMock(return_value=conn)
        mock_get_conn.return_value.__exit__ = MagicMock(return_value=False)

        for _ in range(5):
            client.get(
                "/api/v1/orders/lookup",
                params={"order_number": "HTE-TEST000000", "email": "a@b.com"},
            )

        resp = client.get(
            "/api/v1/orders/lookup",
            params={"order_number": "HTE-TEST000000", "email": "a@b.com"},
        )
        assert resp.status_code == 429
        assert resp.json()["error"]["code"] == "RATE_LIMITED"


# --- Health Endpoint ---


class TestHealthEndpoint:
    def test_health_returns_expected_shape(self, client):
        """Health endpoint should respond even without DB (degraded)."""
        resp = client.get("/health")
        body = resp.json()
        assert "status" in body
        assert "db_connected" in body
        assert "environment" in body
        assert "timezone" in body
        assert body["timezone"] == "America/New_York"
