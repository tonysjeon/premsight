from __future__ import annotations

import asyncio
from collections.abc import Callable


class AdaptiveScheduler:
    def __init__(self, tick: Callable[[], float], *, run_immediately: bool = True) -> None:
        self._tick = tick
        self._run_immediately = run_immediately

    async def run(self, stopped: asyncio.Event) -> None:
        delay = 0.0
        if self._run_immediately and not stopped.is_set():
            delay = await asyncio.to_thread(self._tick)
        while not stopped.is_set():
            try:
                await asyncio.wait_for(stopped.wait(), timeout=max(delay, 0.0))
            except TimeoutError:
                delay = await asyncio.to_thread(self._tick)
