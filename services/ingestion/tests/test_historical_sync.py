from app.domain.models import HistoricalSnapshot, SyncResult
from app.services.historical_sync import HistoricalSyncService
from tests.snapshots import historical_snapshot


class StubProvider:
    def __init__(self, snapshot: HistoricalSnapshot) -> None:
        self.snapshot = snapshot
        self.calls: list[tuple[str, int]] = []

    def fetch_season(self, competition_code: str, season_start_year: int) -> HistoricalSnapshot:
        self.calls.append((competition_code, season_start_year))
        return self.snapshot


class StubRepository:
    def __init__(self) -> None:
        self.snapshots: list[HistoricalSnapshot] = []

    def sync_snapshot(self, snapshot: HistoricalSnapshot) -> SyncResult:
        self.snapshots.append(snapshot)
        return SyncResult(
            competition_id="competition-id",
            season_id="season-id",
            teams_processed=len(snapshot.teams),
            fixtures_processed=len(snapshot.fixtures),
        )


def test_sync_service_passes_normalized_snapshot_to_repository() -> None:
    snapshot = historical_snapshot()
    provider = StubProvider(snapshot)
    repository = StubRepository()

    result = HistoricalSyncService(provider, repository).sync_season("PL", 2025)

    assert provider.calls == [("PL", 2025)]
    assert repository.snapshots == [snapshot]
    assert result.teams_processed == 2
    assert result.fixtures_processed == 1
