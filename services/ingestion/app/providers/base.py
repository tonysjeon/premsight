from typing import Protocol

from app.domain.models import HistoricalSnapshot


class HistoricalDataProvider(Protocol):
    def fetch_season(self, competition_code: str, season_start_year: int) -> HistoricalSnapshot:
        """Fetch and normalize one competition season."""
