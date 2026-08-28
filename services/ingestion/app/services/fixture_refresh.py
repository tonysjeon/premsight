from __future__ import annotations

import logging
import threading
from collections.abc import Callable
from datetime import date

from app.core.config import Settings
from app.domain.models import SyncResult
from app.providers.football_data import FootballDataProvider
from app.repositories.postgres import PostgresHistoricalRepository
from app.services.historical_sync import HistoricalSyncService
from app.services.season_calendar import premier_league_season_start_year

logger = logging.getLogger(__name__)

Refresh = Callable[[str, int], SyncResult]
SeasonYear = Callable[[], int]


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


def build_fixture_refresh_job(settings: Settings) -> FixtureRefreshJob:
    def refresh(competition_code: str, season_start_year: int) -> SyncResult:
        return sync_competition_season(settings, competition_code, season_start_year)

    return FixtureRefreshJob(
        refresh=refresh,
        competition=settings.ingest_competition,
        season_year=lambda: season_start_year_for(settings),
    )
