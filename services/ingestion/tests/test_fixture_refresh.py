import threading
from datetime import UTC, date, datetime

import pytest

from app.core.config import Settings
from app.domain.models import SyncResult
from app.services.fixture_refresh import (
    FixtureRefreshCoordinator,
    FixtureRefreshJob,
    run_refresh_tick,
)
from app.services.match_window import ERROR_SLEEP, LIVE_POLL, FixtureClock


def _result() -> SyncResult:
    return SyncResult(
        competition_id="competition-id",
        season_id="season-id",
        teams_processed=20,
        fixtures_processed=380,
    )


def _at(hour: int, minute: int = 0) -> datetime:
    return datetime(2026, 8, 30, hour, minute, tzinfo=UTC)


def test_job_syncs_competition_season() -> None:
    calls: list[tuple[str, int]] = []

    def refresh(competition: str, year: int) -> SyncResult:
        calls.append((competition, year))
        return _result()

    result = FixtureRefreshJob(refresh, "PL", lambda: 2026).run()

    assert calls == [("PL", 2026)]
    assert result is not None
    assert result.fixtures_processed == 380


def test_job_returns_none_when_refresh_fails() -> None:
    def refresh(_competition: str, _year: int) -> SyncResult:
        raise RuntimeError("provider unavailable")

    assert FixtureRefreshJob(refresh, "PL", lambda: 2026).run() is None


def test_job_skips_overlapping_runs() -> None:
    started = threading.Event()
    release = threading.Event()
    calls: list[tuple[str, int]] = []

    def refresh(competition: str, year: int) -> SyncResult:
        calls.append((competition, year))
        started.set()
        release.wait(timeout=2)
        return _result()

    job = FixtureRefreshJob(refresh, "PL", lambda: 2026)
    worker = threading.Thread(target=job.run)
    worker.start()
    assert started.wait(timeout=2)
    try:
        assert job.run() is None
    finally:
        release.set()
        worker.join(timeout=2)
    assert calls == [("PL", 2026)]


def test_coordinator_syncs_schedule_when_store_empty() -> None:
    schedule_calls: list[tuple[str, int]] = []
    result_calls: list[tuple[str, int, date, date]] = []

    def list_clocks(_code: str) -> tuple[FixtureClock, ...]:
        return ()

    def sync_schedule(code: str, year: int) -> SyncResult:
        schedule_calls.append((code, year))
        return _result()

    def sync_results(code: str, year: int, start: date, end: date) -> int:
        result_calls.append((code, year, start, end))
        return 0

    coordinator = FixtureRefreshCoordinator(
        competition="PL",
        season_year=lambda: 2026,
        list_clocks=list_clocks,
        sync_schedule=sync_schedule,
        sync_results=sync_results,
        clock=lambda: _at(12),
    )

    delay = coordinator.tick()

    assert schedule_calls == [("PL", 2026)]
    assert result_calls == []
    assert delay == ERROR_SLEEP.total_seconds()


def test_coordinator_polls_results_in_match_window() -> None:
    kickoff = _at(15)
    result_calls: list[tuple[str, int, date, date]] = []
    clocks = (FixtureClock(status="live", kickoff_at=kickoff),)

    def sync_results(code: str, year: int, start: date, end: date) -> int:
        result_calls.append((code, year, start, end))
        return 1

    coordinator = FixtureRefreshCoordinator(
        competition="PL",
        season_year=lambda: 2026,
        list_clocks=lambda _code: clocks,
        sync_schedule=lambda _code, _year: _result(),
        sync_results=sync_results,
        clock=lambda: _at(16),
    )

    delay = coordinator.tick()

    assert result_calls == [("PL", 2026, date(2026, 8, 30), date(2026, 8, 30))]
    assert delay == LIVE_POLL.total_seconds()


def test_coordinator_idles_outside_match_window_after_startup_sync() -> None:
    later = FixtureClock(status="scheduled", kickoff_at=datetime(2026, 9, 12, 14, tzinfo=UTC))
    schedule_calls: list[tuple[str, int]] = []

    def sync_schedule(code: str, year: int) -> SyncResult:
        schedule_calls.append((code, year))
        return _result()

    coordinator = FixtureRefreshCoordinator(
        competition="PL",
        season_year=lambda: 2026,
        list_clocks=lambda _code: (later,),
        sync_schedule=sync_schedule,
        sync_results=lambda *_args: 0,
        clock=lambda: _at(12),
    )

    first = coordinator.tick()
    second = coordinator.tick()

    assert schedule_calls == [("PL", 2026)]
    assert first > 0
    assert second == first


def test_coordinator_skips_schedule_when_last_sync_is_recent() -> None:
    later = FixtureClock(status="scheduled", kickoff_at=datetime(2026, 9, 12, 14, tzinfo=UTC))
    schedule_calls: list[tuple[str, int]] = []

    def sync_schedule(code: str, year: int) -> SyncResult:
        schedule_calls.append((code, year))
        return _result()

    coordinator = FixtureRefreshCoordinator(
        competition="PL",
        season_year=lambda: 2026,
        list_clocks=lambda _code: (later,),
        sync_schedule=sync_schedule,
        sync_results=lambda *_args: 0,
        clock=lambda: _at(12),
        last_schedule_sync=_at(12),
    )

    delay = coordinator.tick()

    assert schedule_calls == []
    assert delay > 0


def test_refresh_tick_requires_football_data_token() -> None:
    settings = Settings.model_construct(football_data_api_token="", database_url="postgresql://x")
    with pytest.raises(ValueError, match="FOOTBALL_DATA_API_TOKEN"):
        run_refresh_tick(settings)
