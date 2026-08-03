import logging

from app.domain.models import SyncResult
from app.providers.base import HistoricalDataProvider
from app.repositories.base import HistoricalRepository

logger = logging.getLogger(__name__)


class HistoricalSyncService:
    def __init__(
        self,
        provider: HistoricalDataProvider,
        repository: HistoricalRepository,
    ) -> None:
        self._provider = provider
        self._repository = repository

    def sync_season(self, competition_code: str, season_start_year: int) -> SyncResult:
        logger.info(
            "historical sync started",
            extra={
                "competition_code": competition_code,
                "season_start_year": season_start_year,
            },
        )
        snapshot = self._provider.fetch_season(competition_code, season_start_year)
        result = self._repository.sync_snapshot(snapshot)
        logger.info(
            "historical sync completed",
            extra={
                "provider": snapshot.provider,
                "competition_code": competition_code,
                "season_start_year": season_start_year,
                "teams_processed": result.teams_processed,
                "fixtures_processed": result.fixtures_processed,
            },
        )
        return result
