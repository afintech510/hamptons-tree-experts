import jwt
import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app

TEST_JWT_SECRET = "test-secret-for-unit-tests-only"


class _FakeQuery:
    def __init__(self, rows):
        self._rows = rows

    def select(self, *_args, **_kwargs):
        return self

    def eq(self, *_args, **_kwargs):
        return self

    def limit(self, *_args, **_kwargs):
        return self

    def execute(self):
        class _Result:
            def __init__(self, data):
                self.data = data

        return _Result(self._rows)


class _FakeTable:
    def __init__(self, rows):
        self._rows = rows

    def table(self, _name):
        return _FakeQuery(self._rows)


@pytest.fixture(autouse=True)
def _set_jwt_secret(monkeypatch):
    monkeypatch.setattr(settings, "supabase_jwt_secret", TEST_JWT_SECRET)
    yield


def _make_token(*, uid="00000000-0000-0000-0000-000000000001", aal="aal2", extra=None):
    payload = {"sub": uid, "aud": "authenticated", "email": "admin@example.com", "aal": aal}
    if extra:
        payload.update(extra)
    return jwt.encode(payload, TEST_JWT_SECRET, algorithm="HS256")


@pytest.fixture
def client():
    return TestClient(app)


def test_ping_without_token_returns_401(client):
    resp = client.get("/api/v1/admin/ping")
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "UNAUTHENTICATED"


def test_ping_with_invalid_token_returns_401(client):
    resp = client.get("/api/v1/admin/ping", headers={"Authorization": "Bearer garbage"})
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "INVALID_TOKEN"


def test_ping_without_mfa_returns_401(client):
    token = _make_token(aal="aal1")
    resp = client.get("/api/v1/admin/ping", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "MFA_REQUIRED"


def test_ping_for_non_admin_uid_returns_403(client, monkeypatch):
    monkeypatch.setattr(
        "app.auth.admin._admin_client",
        lambda: _FakeTable(rows=[]),
    )
    token = _make_token()
    resp = client.get("/api/v1/admin/ping", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "NOT_ADMIN"


def test_ping_with_valid_admin_jwt_returns_200(client, monkeypatch):
    uid = "00000000-0000-0000-0000-000000000001"
    monkeypatch.setattr(
        "app.auth.admin._admin_client",
        lambda: _FakeTable(rows=[{"id": uid, "role": "admin"}]),
    )
    token = _make_token(uid=uid)
    resp = client.get("/api/v1/admin/ping", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["admin_uid"] == uid
    assert body["role"] == "admin"
