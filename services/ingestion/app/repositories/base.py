from typing import Protocol

from app.domain.models import HistoricalSnapshot, SyncResult


class HistoricalRepository(Protocol):
    def sync_snapshot(self, snapshot: HistoricalSnapshot) -> SyncResult:
        """Persist one normalized season snapshot atomically."""
