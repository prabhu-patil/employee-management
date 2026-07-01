import logging
from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.core.database import AsyncSessionLocal
from app.services.attendance_service import AttendanceService


logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone="Asia/Kolkata")


async def mark_absent_job() -> None:
    try:
        logger.info("Running daily absent marker job at %s", datetime.now())
        async with AsyncSessionLocal() as db:
            await AttendanceService().mark_absent_for_today(db)
        logger.info("Absent marker complete")
    except Exception:
        logger.exception("Absent marker job failed")


def start_scheduler() -> None:
    scheduler.add_job(
        mark_absent_job,
        trigger="cron",
        hour=23,
        minute=59,
        id="mark_absent_daily",
        replace_existing=True,
    )
    if not scheduler.running:
        scheduler.start()
    message = "Scheduler started — absent marker runs at 23:59 IST daily"
    logger.warning(message)
    print(message, flush=True)


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown()


__all__ = ["scheduler", "start_scheduler", "stop_scheduler"]
