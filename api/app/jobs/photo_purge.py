"""Daily photo purge job (spec §7.3, R-20).

Deletes estimate_photos rows and files past their purge_after date (90d).
Advisory-locked so only one instance runs.
"""

from __future__ import annotations

import logging

import psycopg2.extras

from app.db import get_conn
from app.services.photos import delete_photo

logger = logging.getLogger(__name__)

ADVISORY_LOCK_ID = 100002


def run_photo_purge() -> int:
    """Purge expired photos. Returns the number of files deleted."""
    with get_conn() as conn:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cur.execute("SELECT pg_try_advisory_lock(%s) AS acquired", (ADVISORY_LOCK_ID,))
        if not cur.fetchone()["acquired"]:
            logger.info("photo_purge: another instance holds the lock, skipping")
            return 0

        try:
            cur.execute(
                """
                SELECT id, file_path
                FROM estimate_photos
                WHERE purge_after < CURRENT_DATE
                """
            )
            expired = cur.fetchall()

            count = 0
            for row in expired:
                delete_photo(row["file_path"])
                cur.execute("DELETE FROM estimate_photos WHERE id = %s", (row["id"],))
                count += 1

            conn.commit()

            cur.execute(
                """
                INSERT INTO job_runs (job_name, last_success_at)
                VALUES ('photo_purge', now())
                ON CONFLICT (job_name) DO UPDATE SET last_success_at = now()
                """
            )
            conn.commit()

            logger.info("photo_purge: deleted %d expired photos", count)
            return count
        finally:
            cur.execute("SELECT pg_advisory_unlock(%s)", (ADVISORY_LOCK_ID,))
            conn.commit()
