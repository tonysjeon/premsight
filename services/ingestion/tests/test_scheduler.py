import asyncio

import pytest

from app.services.scheduler import IntervalScheduler


def test_scheduler_rejects_non_positive_interval() -> None:
    with pytest.raises(ValueError, match="interval_seconds must be positive"):
        IntervalScheduler(lambda: None, 0, run_immediately=True)


def test_scheduler_runs_immediately_then_stops() -> None:
    calls: list[int] = []
    stopped = asyncio.Event()

    def job() -> None:
        calls.append(1)
        stopped.set()

    async def run() -> None:
        await IntervalScheduler(job, interval_seconds=5, run_immediately=True).run(stopped)

    asyncio.run(run())
    assert calls == [1]


def test_scheduler_runs_after_interval() -> None:
    calls: list[int] = []
    stopped = asyncio.Event()

    def job() -> None:
        calls.append(1)
        if len(calls) >= 2:
            stopped.set()

    async def run() -> None:
        await IntervalScheduler(job, interval_seconds=0.01, run_immediately=False).run(stopped)

    asyncio.run(run())
    assert calls == [1, 1]
