"""Reauth token HMAC tests (R-05).

Verifies generate/verify round-trip, wrong-token rejection, wrong-order
rejection, determinism, and timing-safe comparison.
"""

from unittest.mock import patch

import pytest

from app.services.reauth_token import generate_reauth_token, verify_reauth_token

SECRET = "test-secret-key-for-unit-tests"


@pytest.fixture(autouse=True)
def _mock_secret(monkeypatch):
    monkeypatch.setattr("app.services.reauth_token.settings.supabase_jwt_secret", SECRET)


class TestGenerate:
    def test_returns_64_char_hex(self):
        token = generate_reauth_token("order-uuid-123")
        assert isinstance(token, str)
        assert len(token) == 64
        int(token, 16)  # validates hex

    def test_deterministic(self):
        t1 = generate_reauth_token("order-uuid-123")
        t2 = generate_reauth_token("order-uuid-123")
        assert t1 == t2

    def test_different_order_ids_produce_different_tokens(self):
        t1 = generate_reauth_token("order-a")
        t2 = generate_reauth_token("order-b")
        assert t1 != t2


class TestVerify:
    def test_correct_token_passes(self):
        token = generate_reauth_token("order-uuid-123")
        assert verify_reauth_token("order-uuid-123", token) is True

    def test_wrong_token_fails(self):
        assert verify_reauth_token("order-uuid-123", "a" * 64) is False

    def test_wrong_order_id_fails(self):
        token = generate_reauth_token("order-uuid-123")
        assert verify_reauth_token("different-order", token) is False

    def test_empty_token_fails(self):
        assert verify_reauth_token("order-uuid-123", "") is False

    def test_uses_timing_safe_comparison(self):
        import inspect
        src = inspect.getsource(verify_reauth_token)
        assert "compare_digest" in src


class TestSecretDependency:
    def test_different_secrets_produce_different_tokens(self, monkeypatch):
        monkeypatch.setattr("app.services.reauth_token.settings.supabase_jwt_secret", "secret-1")
        t1 = generate_reauth_token("order-uuid-123")
        monkeypatch.setattr("app.services.reauth_token.settings.supabase_jwt_secret", "secret-2")
        t2 = generate_reauth_token("order-uuid-123")
        assert t1 != t2

    def test_token_from_wrong_secret_fails_verification(self, monkeypatch):
        monkeypatch.setattr("app.services.reauth_token.settings.supabase_jwt_secret", "secret-1")
        token = generate_reauth_token("order-uuid-123")
        monkeypatch.setattr("app.services.reauth_token.settings.supabase_jwt_secret", "secret-2")
        assert verify_reauth_token("order-uuid-123", token) is False
