import os

import psycopg
import pytest
from premsight_database.migrator import migrate_down_all, migrate_up
from psycopg.conninfo import conninfo_to_dict

from app.repositories.postgres import PostgresHistoricalRepository
from tests.snapshots import historical_snapshot


def _require_disposable_database(database_url: str) -> None:
    database_name = conninfo_to_dict(database_url).get("dbname", "")
    if not database_name.endswith("_test"):
        pytest.fail("Ingestion integration tests require a database name ending in '_test'")


@pytest.fixture
def database_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if not url:
        pytest.skip("DATABASE_URL is required for repository integration tests")
    _require_disposable_database(url)
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
                (SELECT count(*) FROM provider_references),
                (SELECT count(*) FROM match_events)
            """
        ).fetchone()
        fixture = conn.execute(
            "SELECT status, home_score, away_score, venue FROM fixtures"
        ).fetchone()
        events = conn.execute(
            "SELECT event_type, minute, player_name FROM match_events ORDER BY sort_key"
        ).fetchall()

    assert counts == (1, 1, 2, 1, 5, 2)
    assert fixture == ("completed", 2, 1, "Emirates Stadium")
    assert events == [("goal", 12, "Bukayo Saka"), ("card", 34, "Moises Caicedo")]


def test_last_fixture_write_is_none_without_current_season_rows(database_url: str) -> None:
    repository = PostgresHistoricalRepository(database_url)
    repository.sync_snapshot(historical_snapshot())
    assert repository.last_fixture_write("PL") is None


def test_last_fixture_write_returns_current_season_timestamp(database_url: str) -> None:
    repository = PostgresHistoricalRepository(database_url)
    repository.sync_snapshot(historical_snapshot())
    with psycopg.connect(database_url) as conn:
        conn.execute("UPDATE seasons SET is_current = TRUE")
        conn.commit()

    written = repository.last_fixture_write("PL")
    assert written is not None
    assert repository.last_fixture_write("XX") is None
