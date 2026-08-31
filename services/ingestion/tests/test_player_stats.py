import os

import psycopg
import pytest
from premsight_database.migrator import migrate_down_all, migrate_up, seed
from psycopg.conninfo import conninfo_to_dict

from app.providers.fbref import FbrefSeasonStats, RawPlayerStat
from app.repositories.player_stats import PostgresPlayerStatsRepository


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
    seed(url)
    try:
        yield url
    finally:
        migrate_down_all(url)


def test_sync_player_stats_persists_features(database_url: str) -> None:
    with psycopg.connect(database_url) as conn:
        season_id = conn.execute(
            """SELECT s.id FROM seasons s JOIN competitions c ON c.id=s.competition_id
               WHERE c.code='PL' AND s.is_current"""
        ).fetchone()[0]

        team_id = conn.execute(
            """INSERT INTO teams (name, short_name, tla)
               VALUES ('Arsenal', 'Arsenal', 'ARS') RETURNING id"""
        ).fetchone()[0]

        player_id = conn.execute(
            """INSERT INTO players (
                 first_name, last_name, display_name,
                 nationality_code, photo_url, slug
               )
               VALUES (
                 'Bukayo', 'Saka', 'Saka', 'EN',
                 'https://resources.premierleague.com/saka.png', 'bukayo-saka'
               )
               RETURNING id"""
        ).fetchone()[0]

        conn.execute(
            """INSERT INTO squad_memberships (
                 season_id, player_id, team_id, position, positions, squad_number
               )
               VALUES (%s, %s, %s, 'FWD', ARRAY['FWD', 'RW']::TEXT[], 7)""",
            (season_id, player_id, team_id),
        )
        conn.commit()

    season_stats = FbrefSeasonStats(
        provider="fbref",
        model_version="player-sim-v1",
        season_name="2026/2027",
        players=(
            RawPlayerStat(
                name="Bukayo Saka",
                team="Arsenal",
                position="FWD",
                minutes=900,
                stats={"goals_per90": 0.42, "assists_per90": 0.35},
                features=[0.42, 2.5, 0.35, 1.8],
            ),
        ),
    )

    repo = PostgresPlayerStatsRepository(database_url)
    result = repo.sync_stats(season_stats)
    assert result.matched_players == 1

    with psycopg.connect(database_url) as conn:
        row = conn.execute(
            """SELECT minutes, stats, features, provider, model_version, position_family
               FROM player_season_stats WHERE player_id = %s""",
            (player_id,),
        ).fetchone()
        assert row is not None
        assert row[0] == 900
        assert row[1]["goals_per90"] == 0.42
        assert len(row[2]) == 4
        assert row[3] == "fbref"
        assert row[4] == "player-sim-v1"
        assert row[5] == "FWD"
