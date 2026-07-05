"""Database connection pool for transactional work (psycopg2).

The Supabase Python SDK is used for simple reads (admin auth, dashboard queries),
but capacity reservation, order creation, and the reserve-then-charge pattern
(R-01) require explicit transaction control that the SDK doesn't expose.
"""

from __future__ import annotations

from contextlib import contextmanager
from typing import Generator

import psycopg2
import psycopg2.pool

from app.config import settings

_pool: psycopg2.pool.ThreadedConnectionPool | None = None


def _get_pool() -> psycopg2.pool.ThreadedConnectionPool:
    global _pool
    if _pool is None:
        _pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=2,
            maxconn=10,
            dsn=settings.supabase_db_url,
        )
    return _pool


@contextmanager
def get_conn() -> Generator:
    pool = _get_pool()
    conn = pool.getconn()
    try:
        yield conn
    finally:
        if not conn.closed:
            conn.rollback()
        pool.putconn(conn)


@contextmanager
def get_cursor(commit: bool = False) -> Generator:
    with get_conn() as conn:
        cur = conn.cursor()
        try:
            yield cur
            if commit:
                conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            cur.close()


def close_pool() -> None:
    global _pool
    if _pool is not None:
        _pool.closeall()
        _pool = None
