from contextlib import asynccontextmanager
from datetime import datetime

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI

from app.config import BUSINESS_TZ, settings
from app.errors import register_error_handlers
from app.routers.admin import router as admin_router
from app.routers.authorize_confirm import router as authorize_confirm_router
from app.routers.estimates import router as estimates_router
from app.routers.orders import router as orders_router
from app.routers.pricing import router as pricing_router
from app.routers.webhooks import router as webhooks_router


def _start_scheduler() -> BackgroundScheduler:
    from app.jobs.photo_purge import run_photo_purge
    from app.jobs.soft_hold_expiry import run_soft_hold_expiry

    scheduler = BackgroundScheduler(timezone=str(BUSINESS_TZ))
    scheduler.add_job(run_soft_hold_expiry, "interval", minutes=15, id="soft_hold_expiry")
    scheduler.add_job(run_photo_purge, "cron", hour=3, minute=0, id="photo_purge")
    scheduler.start()
    return scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = _start_scheduler()
    yield
    scheduler.shutdown(wait=False)
    from app.db import close_pool
    close_pool()


app = FastAPI(
    title="Hamptons Tree Experts API",
    version="0.2.0",
    docs_url="/api/v1/docs" if settings.environment != "production" else None,
    redoc_url=None,
    lifespan=lifespan,
)

register_error_handlers(app)
app.include_router(admin_router)
app.include_router(authorize_confirm_router)
app.include_router(estimates_router)
app.include_router(orders_router)
app.include_router(pricing_router)
app.include_router(webhooks_router)


JOB_EXPECTED_INTERVALS = {
    "soft_hold_expiry": 30 * 60,
    "photo_purge": 25 * 60 * 60,  # daily job, 25h staleness
}


@app.get("/health")
async def health():
    db_ok = False
    jobs: dict = {}
    try:
        from app.db import get_conn
        import psycopg2.extras

        with get_conn() as conn:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("SELECT 1")
            db_ok = True

            cur.execute("SELECT job_name, last_success_at FROM job_runs")
            now = datetime.now(BUSINESS_TZ)
            for row in cur.fetchall():
                name = row["job_name"]
                last = row["last_success_at"]
                max_age = JOB_EXPECTED_INTERVALS.get(name, 3600)
                stale = last is None or (now - last.astimezone(BUSINESS_TZ)).total_seconds() > max_age
                jobs[name] = {
                    "last_success_at": last.isoformat() if last else None,
                    "stale": stale,
                }
    except Exception:
        pass

    all_healthy = db_ok and not any(j.get("stale") for j in jobs.values())

    return {
        "status": "ok" if all_healthy else "degraded",
        "db_connected": db_ok,
        "jobs": jobs,
        "environment": settings.environment,
        "timezone": str(BUSINESS_TZ),
        "server_time_et": datetime.now(BUSINESS_TZ).isoformat(),
    }
