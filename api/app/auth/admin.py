"""Admin JWT-validation dependency for /api/v1/admin/* (spec §7.1, §7.2).

Validates the Supabase-issued admin session JWT (HS256, shared project JWT
secret), requires MFA (Authenticator Assurance Level 2 — R-13-adjacent bootstrap
requirement), and confirms the uid has a live `admin_users` row so access can be
revoked independently of the underlying Supabase Auth account.

The admin endpoints themselves (dashboard, order actions, etc.) are built in
later phases; this module only provides the dependency + the proof-of-life
`/api/v1/admin/ping` route.
"""

from __future__ import annotations

from dataclasses import dataclass

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import Client, create_client

from app.config import settings

_bearer_scheme = HTTPBearer(auto_error=False)


def _error(code: str, message: str) -> dict:
    return {"error": {"code": code, "message": message, "details": {}}}


def _admin_client() -> Client:
    return create_client(settings.supabase_url, settings.supabase_service_key)


@dataclass(frozen=True)
class AdminPrincipal:
    uid: str
    email: str | None
    role: str


async def get_current_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> AdminPrincipal:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=_error("UNAUTHENTICATED", "Missing bearer token"),
        )

    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=_error("INVALID_TOKEN", "Invalid or expired token"),
        ) from exc

    uid = payload.get("sub")
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=_error("INVALID_TOKEN", "Token missing subject"),
        )

    if payload.get("aal") != "aal2":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=_error("MFA_REQUIRED", "Multi-factor authentication required"),
        )

    result = _admin_client().table("admin_users").select("id, role").eq("id", uid).limit(1).execute()
    rows = result.data or []
    if not rows:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=_error("NOT_ADMIN", "Account is not an active admin"),
        )

    return AdminPrincipal(uid=uid, email=payload.get("email"), role=rows[0]["role"])
