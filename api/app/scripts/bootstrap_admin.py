"""One-off admin bootstrap script (spec §7.1, §2.4).

Creates the single launch admin via the Supabase Auth admin API, forces a
password change on first login, and links the account into `admin_users`.

Run once, from inside the api container/venv:

    python -m app.scripts.bootstrap_admin

Credentials come from ADMIN_BOOTSTRAP_EMAIL / ADMIN_BOOTSTRAP_PASSWORD in the
environment (never committed — see .env.example). Safe to re-run: if a user
with that email already exists, the script links/updates the existing account
instead of creating a duplicate.

MFA note: TOTP enrollment is an interactive challenge-response flow that
cannot be completed headless via the admin API. This script marks the account
must_change_password=true; the admin JWT middleware (app/auth/admin.py)
requires aal2 (MFA-verified) on every /api/v1/admin/* request, so the admin
is forced to change their password AND enroll MFA via the Supabase Auth UI on
first login before any admin endpoint becomes reachable.
"""

from __future__ import annotations

import sys

from supabase import create_client

from app.config import settings


def bootstrap_admin() -> None:
    if not settings.admin_bootstrap_email or not settings.admin_bootstrap_password:
        print("ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD must be set.", file=sys.stderr)
        sys.exit(1)
    if not settings.supabase_url or not settings.supabase_service_key:
        print("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set.", file=sys.stderr)
        sys.exit(1)

    client = create_client(settings.supabase_url, settings.supabase_service_key)

    existing = next(
        (
            u
            for u in client.auth.admin.list_users()
            if u.email == settings.admin_bootstrap_email
        ),
        None,
    )

    if existing is not None:
        uid = existing.id
        print(f"Admin user already exists ({settings.admin_bootstrap_email}), uid={uid}")
    else:
        created = client.auth.admin.create_user(
            {
                "email": settings.admin_bootstrap_email,
                "password": settings.admin_bootstrap_password,
                "email_confirm": True,
                "user_metadata": {"must_change_password": True},
            }
        )
        uid = created.user.id
        print(f"Created admin user {settings.admin_bootstrap_email}, uid={uid}")

    client.table("admin_users").upsert({"id": uid, "role": "admin"}).execute()
    print("Linked admin_users row.")
    print(
        "Next: log in as this admin, change the password, and complete TOTP MFA "
        "enrollment — admin endpoints require an aal2 (MFA-verified) session."
    )


if __name__ == "__main__":
    bootstrap_admin()
