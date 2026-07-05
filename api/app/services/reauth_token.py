"""HMAC token generation/verification for Extend re-authorization links (R-05)."""

from __future__ import annotations

import hashlib
import hmac

from app.config import settings


def generate_reauth_token(order_id: str) -> str:
    secret = settings.supabase_jwt_secret
    payload = f"{order_id}:reauth"
    return hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()


def verify_reauth_token(order_id: str, token: str) -> bool:
    expected = generate_reauth_token(order_id)
    return hmac.compare_digest(expected, token)
