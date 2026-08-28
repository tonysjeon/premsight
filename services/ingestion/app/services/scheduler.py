from __future__ import annotations

import asyncio
from collections.abc import Callable


class IntervalScheduler:
    def __init__(
        self,
        job: Callable[[], object],
        interval_seconds: float,
        *,
        run_immediately: bool,
    ) -> None:
        if interval_seconds <= 0:
            raise ValueError("interval_seconds must be positive")
        self._job = job
        self._interval_seconds = interval_seconds
        self._run_immediately = run_immediately

    async def run(self, stopped: asyncio.Event) -> None:
        if self._run_immediately and not stopped.is_set():
            await asyncio.to_thread(self._job)
        while not stopped.is_set():
            try:
                await asyncio.wait_for(stopped.wait(), timeout=self._interval_seconds)
            except TimeoutError:
                await asyncio.to_thread(self._job)
