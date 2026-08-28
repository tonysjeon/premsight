import threading

from app.domain.models import SyncResult
from app.services.fixture_refresh import FixtureRefreshJob


def _result() -> SyncResult:
    return SyncResult(
        competition_id="competition-id",
        season_id="season-id",
        teams_processed=20,
        fixtures_processed=380,
    )


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
