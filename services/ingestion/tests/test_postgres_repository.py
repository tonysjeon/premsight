import os

import psycopg
import pytest
from premsight_database.migrator import migrate_down_all, migrate_up

from app.repositories.postgres import PostgresHistoricalRepository
from tests.snapshots import historical_snapshot


@pytest.fixture
def database_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if not url:
        pytest.skip("DATABASE_URL is required for repository integration tests")
    migrate_down_all(url)
    migrate_up(url)
    try:
        yield url
    finally:
        migrate_down_all(url)


def test_snapshot_replay_is_idempotent(database_url: str) -> None:
    repository = PostgresHistoricalRepository(database_url)
    snapshot = historical_snapshot()

    first = repository.sync_snapshot(snapshot)
    second = repository.sync_snapshot(snapshot)

    assert first.competition_id == second.competition_id
    assert first.season_id == second.season_id
    with psycopg.connect(database_url) as conn:
        counts = conn.execute(
            """
            SELECT
                (SELECT count(*) FROM competitions),
                (SELECT count(*) FROM seasons),
                (SELECT count(*) FROM teams),
                (SELECT count(*) FROM fixtures),
                (SELECT count(*) FROM provider_references)
            """
        ).fetchone()
        fixture = conn.execute(
            "SELECT status, home_score, away_score, venue FROM fixtures"
        ).fetchone()

    assert counts == (1, 1, 2, 1, 5)
    assert fixture == ("completed", 2, 1, "Emirates Stadium")
