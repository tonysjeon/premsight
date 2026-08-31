from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from typing import Literal

from app.domain.models import FixtureStatus

FINAL_STATUSES: frozenset[str] = frozenset({"completed", "cancelled", "postponed"})

PRE_KICKOFF = timedelta(minutes=15)
LIVE_POLL = timedelta(seconds=60)
WINDOW_POLL = timedelta(minutes=3)
SCHEDULE_SYNC_EVERY = timedelta(hours=24)
MIN_SLEEP = timedelta(seconds=1)
ERROR_SLEEP = timedelta(seconds=60)

RefreshMode = Literal["schedule", "results", "idle"]


@dataclass(frozen=True, slots=True)
class FixtureClock:
    status: FixtureStatus
    kickoff_at: datetime


@dataclass(frozen=True, slots=True)
class RefreshPlan:
    mode: RefreshMode
    sleep: timedelta
    date_from: date | None = None
    date_to: date | None = None
    reason: str = ""

    @property
    def sleep_seconds(self) -> float:
        return max(self.sleep.total_seconds(), MIN_SLEEP.total_seconds())


def _utc(moment: datetime) -> datetime:
    if moment.tzinfo is None:
        return moment.replace(tzinfo=UTC)
    return moment.astimezone(UTC)


def is_final_status(status: str) -> bool:
    return status in FINAL_STATUSES


def _open_fixtures(fixtures: tuple[FixtureClock, ...]) -> tuple[FixtureClock, ...]:
    return tuple(item for item in fixtures if not is_final_status(item.status))


def _actionable(fixtures: tuple[FixtureClock, ...], now: datetime) -> tuple[FixtureClock, ...]:
    return tuple(item for item in fixtures if now >= _utc(item.kickoff_at) - PRE_KICKOFF)


def result_query_dates(
    fixtures: tuple[FixtureClock, ...],
    now: datetime,
) -> tuple[date, date]:
    now_utc = _utc(now)
    days = {now_utc.date()}
    for item in fixtures:
        days.add(_utc(item.kickoff_at).date())
    return min(days), max(days)


def plan_refresh(
    fixtures: tuple[FixtureClock, ...],
    now: datetime,
    last_schedule_sync: datetime | None,
    *,
    schedule_every: timedelta = SCHEDULE_SYNC_EVERY,
) -> RefreshPlan:
    now_utc = _utc(now)
    last = None if last_schedule_sync is None else _utc(last_schedule_sync)
    schedule_due = last is None or now_utc - last >= schedule_every

    if not fixtures:
        return RefreshPlan(
            mode="schedule",
            sleep=ERROR_SLEEP,
            reason="no current-season fixtures stored",
        )

    open_fixtures = _open_fixtures(fixtures)
    due_results = _actionable(open_fixtures, now_utc)
    if due_results:
        live = any(
            item.status == "live" or now_utc >= _utc(item.kickoff_at) for item in due_results
        )
        date_from, date_to = result_query_dates(due_results, now_utc)
        return RefreshPlan(
            mode="results",
            sleep=LIVE_POLL if live else WINDOW_POLL,
            date_from=date_from,
            date_to=date_to,
            reason="live matches" if live else "match window",
        )

    if schedule_due:
        return RefreshPlan(
            mode="schedule",
            sleep=ERROR_SLEEP,
            reason="periodic schedule sync" if last is not None else "startup schedule sync",
        )

    next_open = min((_utc(item.kickoff_at) for item in open_fixtures), default=None)
    until_window = (
        (next_open - PRE_KICKOFF - now_utc) if next_open is not None else schedule_every
    )
    until_schedule = schedule_every - (now_utc - last)
    sleep = min(until_window, until_schedule)
    if sleep < MIN_SLEEP:
        sleep = MIN_SLEEP
    return RefreshPlan(
        mode="idle",
        sleep=sleep,
        reason="outside match window",
    )
