from __future__ import annotations

import logging
import threading
from collections.abc import Callable
from datetime import UTC, date, datetime

from app.core.config import Settings
from app.domain.models import SyncResult
from app.providers.football_data import PROVIDER_NAME, FootballDataProvider
from app.repositories.postgres import PostgresHistoricalRepository
from app.services.historical_sync import HistoricalSyncService
from app.services.match_window import ERROR_SLEEP, FixtureClock, plan_refresh
from app.services.season_calendar import premier_league_season_start_year

logger = logging.getLogger(__name__)

Refresh = Callable[[str, int], SyncResult]
SeasonYear = Callable[[], int]
Clock = Callable[[], datetime]


def season_start_year_for(settings: Settings, today: date | None = None) -> int:
    if settings.ingest_season_start_year is not None:
        return settings.ingest_season_start_year
    return premier_league_season_start_year(today)


def sync_competition_season(
    settings: Settings,
    competition_code: str,
    season_start_year: int,
) -> SyncResult:
    repository = PostgresHistoricalRepository(settings.database_url)
    with FootballDataProvider(
        api_token=settings.football_data_api_token,
        base_url=settings.football_data_base_url,
    ) as provider:
        return HistoricalSyncService(provider, repository).sync_season(
            competition_code, season_start_year
        )


def sync_match_results(
    settings: Settings,
    competition_code: str,
    season_start_year: int,
    date_from: date,
    date_to: date,
) -> int:
    repository = PostgresHistoricalRepository(settings.database_url)
    with FootballDataProvider(
        api_token=settings.football_data_api_token,
        base_url=settings.football_data_base_url,
    ) as provider:
        fixtures = provider.fetch_matches(
            competition_code, season_start_year, date_from, date_to
        )
    return repository.apply_match_results(PROVIDER_NAME, fixtures)


class FixtureRefreshJob:
    def __init__(self, refresh: Refresh, competition: str, season_year: SeasonYear) -> None:
        self._refresh = refresh
        self._competition = competition
        self._season_year = season_year
        self._lock = threading.Lock()

    def run(self) -> SyncResult | None:
        if not self._lock.acquire(blocking=False):
            logger.warning("fixture refresh skipped; previous run still in progress")
            return None
        try:
            season_start_year = self._season_year()
            logger.info(
                "fixture refresh started",
                extra={
                    "competition_code": self._competition,
                    "season_start_year": season_start_year,
                },
            )
            result = self._refresh(self._competition, season_start_year)
            logger.info(
                "fixture refresh completed",
                extra={
                    "competition_code": self._competition,
                    "season_start_year": season_start_year,
                    "teams_processed": result.teams_processed,
                    "fixtures_processed": result.fixtures_processed,
                },
            )
            return result
        except Exception:
            logger.exception("fixture refresh failed")
            return None
        finally:
            self._lock.release()


class FixtureRefreshCoordinator:
    def __init__(
        self,
        *,
        competition: str,
        season_year: SeasonYear,
        list_clocks: Callable[[str], tuple[FixtureClock, ...]],
        sync_schedule: Refresh,
        sync_results: Callable[[str, int, date, date], int],
        clock: Clock,
        last_schedule_sync: datetime | None = None,
    ) -> None:
        self._competition = competition
        self._season_year = season_year
        self._list_clocks = list_clocks
        self._sync_schedule = sync_schedule
        self._sync_results = sync_results
        self._clock = clock
        self._lock = threading.Lock()
        self._last_schedule_sync = last_schedule_sync

    def tick(self) -> float:
        if not self._lock.acquire(blocking=False):
            logger.warning("fixture refresh skipped; previous run still in progress")
            return ERROR_SLEEP.total_seconds()
        try:
            return self._tick_locked()
        except Exception:
            logger.exception("fixture refresh failed")
            return ERROR_SLEEP.total_seconds()
        finally:
            self._lock.release()

    def _tick_locked(self) -> float:
        now = self._clock()
        clocks = self._list_clocks(self._competition)
        plan = plan_refresh(clocks, now, self._last_schedule_sync)
        year = self._season_year()

        if plan.mode == "schedule":
            logger.info(
                "schedule sync started",
                extra={"competition_code": self._competition, "season_start_year": year},
            )
            result = self._sync_schedule(self._competition, year)
            self._last_schedule_sync = now
            logger.info(
                "schedule sync completed",
                extra={
                    "competition_code": self._competition,
                    "teams_processed": result.teams_processed,
                    "fixtures_processed": result.fixtures_processed,
                },
            )
            clocks = self._list_clocks(self._competition)
            plan = plan_refresh(clocks, self._clock(), self._last_schedule_sync)

        if plan.mode == "results" and plan.date_from is not None and plan.date_to is not None:
            logger.info(
                "result sync started",
                extra={
                    "competition_code": self._competition,
                    "date_from": plan.date_from.isoformat(),
                    "date_to": plan.date_to.isoformat(),
                    "reason": plan.reason,
                },
            )
            updated = self._sync_results(
                self._competition, year, plan.date_from, plan.date_to
            )
            logger.info(
                "result sync completed",
                extra={"fixtures_updated": updated, "reason": plan.reason},
            )
            clocks = self._list_clocks(self._competition)
            plan = plan_refresh(clocks, self._clock(), self._last_schedule_sync)

        if plan.mode == "idle":
            logger.info(
                "fixture refresh idle",
                extra={
                    "sleep_seconds": plan.sleep_seconds,
                    "reason": plan.reason,
                },
            )
        return plan.sleep_seconds


def build_fixture_refresh_job(settings: Settings) -> FixtureRefreshJob:
    def refresh(competition_code: str, season_start_year: int) -> SyncResult:
        return sync_competition_season(settings, competition_code, season_start_year)

    return FixtureRefreshJob(
        refresh=refresh,
        competition=settings.ingest_competition,
        season_year=lambda: season_start_year_for(settings),
    )


def build_fixture_refresh_coordinator(
    settings: Settings,
    *,
    last_schedule_sync: datetime | None = None,
) -> FixtureRefreshCoordinator:
    repository = PostgresHistoricalRepository(settings.database_url)

    def sync_schedule(competition_code: str, season_start_year: int) -> SyncResult:
        return sync_competition_season(settings, competition_code, season_start_year)

    def sync_results(
        competition_code: str,
        season_start_year: int,
        date_from: date,
        date_to: date,
    ) -> int:
        return sync_match_results(
            settings, competition_code, season_start_year, date_from, date_to
        )

    return FixtureRefreshCoordinator(
        competition=settings.ingest_competition,
        season_year=lambda: season_start_year_for(settings),
        list_clocks=repository.list_fixture_clocks,
        sync_schedule=sync_schedule,
        sync_results=sync_results,
        clock=lambda: datetime.now(UTC),
        last_schedule_sync=last_schedule_sync,
    )


def run_refresh_tick(settings: Settings) -> float:
    if not settings.football_data_api_token.strip():
        raise ValueError("FOOTBALL_DATA_API_TOKEN is required for fixture refresh")
    repository = PostgresHistoricalRepository(settings.database_url)
    coordinator = build_fixture_refresh_coordinator(
        settings,
        last_schedule_sync=repository.last_fixture_write(settings.ingest_competition),
    )
    return coordinator.tick()
