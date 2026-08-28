from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.router import api_router
from app.core.config import get_settings, scheduler_should_run
from app.services.fixture_refresh import build_fixture_refresh_job
from app.services.scheduler import IntervalScheduler

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    stopped = asyncio.Event()
    task: asyncio.Task[None] | None = None
    if scheduler_should_run(settings):
        scheduler = IntervalScheduler(
            build_fixture_refresh_job(settings).run,
            float(settings.schedule_interval_seconds),
            run_immediately=settings.schedule_run_on_startup,
        )
        task = asyncio.create_task(scheduler.run(stopped), name="fixture-refresh")
        logger.info(
            "fixture refresh scheduler started",
            extra={
                "interval_seconds": settings.schedule_interval_seconds,
                "run_on_startup": settings.schedule_run_on_startup,
                "competition_code": settings.ingest_competition,
            },
        )
    elif settings.schedule_enabled:
        logger.warning("fixture refresh scheduler disabled; FOOTBALL_DATA_API_TOKEN is not set")
    yield
    stopped.set()
    if task is not None:
        await task


def create_app() -> FastAPI:
    settings = get_settings()
    application = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)
    application.include_router(api_router)
    return application


app = create_app()
