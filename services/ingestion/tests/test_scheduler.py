import asyncio

from app.services.scheduler import AdaptiveScheduler


def test_scheduler_runs_immediately_then_stops() -> None:
    calls: list[int] = []
    stopped = asyncio.Event()

    def tick() -> float:
        calls.append(1)
        stopped.set()
        return 5

    async def run() -> None:
        await AdaptiveScheduler(tick, run_immediately=True).run(stopped)

    asyncio.run(run())
    assert calls == [1]


def test_scheduler_ticks_again_after_delay() -> None:
    calls: list[int] = []
    stopped = asyncio.Event()

    def tick() -> float:
        calls.append(1)
        if len(calls) >= 2:
            stopped.set()
        return 0.01

    async def run() -> None:
        await AdaptiveScheduler(tick, run_immediately=True).run(stopped)

    asyncio.run(run())
    assert calls == [1, 1]
