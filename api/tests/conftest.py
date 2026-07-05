"""Shared fixtures for the test suite.

Integration tests require a PostgreSQL connection (set TEST_DATABASE_URL).
They are marked with @pytest.mark.integration and skipped when no DB is
available.
"""

from __future__ import annotations

import os

import pytest

INTEGRATION_DB_URL = os.environ.get("TEST_DATABASE_URL", "")


def pytest_configure(config):
    config.addinivalue_line("markers", "integration: requires a live PostgreSQL database")


def pytest_collection_modifyitems(config, items):
    if INTEGRATION_DB_URL:
        return
    skip = pytest.mark.skip(reason="TEST_DATABASE_URL not set")
    for item in items:
        if "integration" in item.keywords:
            item.add_marker(skip)


@pytest.fixture
def db_conn():
    """Yield a psycopg2 connection to the test database, rolled back after use."""
    import psycopg2

    if not INTEGRATION_DB_URL:
        pytest.skip("TEST_DATABASE_URL not set")

    conn = psycopg2.connect(INTEGRATION_DB_URL)
    try:
        yield conn
    finally:
        conn.rollback()
        conn.close()


@pytest.fixture
def integration_schema(db_conn):
    """Set up the minimal schema needed for capacity integration tests.

    Uses a savepoint so the test's changes are rolled back automatically.
    """
    cur = db_conn.cursor()

    cur.execute("SAVEPOINT integration_test")

    cur.execute("""
        CREATE TABLE IF NOT EXISTS capacity_days (
            day         date PRIMARY KEY,
            am_blocked  boolean NOT NULL DEFAULT false,
            pm_blocked  boolean NOT NULL DEFAULT false,
            created_at  timestamptz NOT NULL DEFAULT now()
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            order_number         text NOT NULL UNIQUE,
            service_type_id      uuid,
            fulfillment_type     text NOT NULL DEFAULT 'bin_immediate',
            status               text NOT NULL DEFAULT 'pending_payment',
            urgency_tier         text,
            amount_cents         integer NOT NULL DEFAULT 0,
            original_quote_cents integer NOT NULL DEFAULT 0,
            policy_acknowledged  boolean NOT NULL DEFAULT false,
            stripe_payment_intent_id text,
            stripe_auth_expires_at   timestamptz,
            customer_email       text NOT NULL DEFAULT '',
            customer_phone       text NOT NULL DEFAULT '',
            customer_name        text NOT NULL DEFAULT '',
            service_address      text NOT NULL DEFAULT '',
            slot_id              uuid,
            idempotency_key      text UNIQUE,
            created_at           timestamptz NOT NULL DEFAULT now(),
            updated_at           timestamptz NOT NULL DEFAULT now()
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS capacity_slots (
            id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            day                  date NOT NULL REFERENCES capacity_days (day),
            slot                 text NOT NULL CHECK (slot IN ('am', 'pm')),
            hold_type            text NOT NULL CHECK (hold_type IN ('confirmed', 'tentative')),
            order_id             uuid REFERENCES orders (id),
            soft_hold_expires_at timestamptz,
            created_at           timestamptz NOT NULL DEFAULT now(),
            CONSTRAINT uq_capacity_slots_day_slot UNIQUE (day, slot)
        )
    """)
    db_conn.commit()

    yield db_conn

    cur.execute("ROLLBACK TO SAVEPOINT integration_test")
    db_conn.commit()

    cur.execute("DROP TABLE IF EXISTS capacity_slots CASCADE")
    cur.execute("DROP TABLE IF EXISTS orders CASCADE")
    cur.execute("DROP TABLE IF EXISTS capacity_days CASCADE")
    db_conn.commit()
    cur.close()
