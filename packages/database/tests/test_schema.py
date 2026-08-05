from __future__ import annotations

import psycopg
import pytest
from psycopg.errors import CheckViolation, ForeignKeyViolation, UniqueViolation

from premsight_database.migrator import (
    applied_versions,
    migrate_down,
    migrate_down_all,
    migrate_up,
    seed,
)
from premsight_database.paths import MIGRATIONS_DIR, SEEDS_DIR


def test_runtime_package_contains_sql_assets() -> None:
    assert sorted(path.name for path in MIGRATIONS_DIR.glob("*.sql")) == [
        "0001_placeholder.down.sql",
        "0001_placeholder.up.sql",
        "0002_core_football_schema.down.sql",
        "0002_core_football_schema.up.sql",
        "0003_fixture_integrity.down.sql",
        "0003_fixture_integrity.up.sql",
        "0004_team_crests.down.sql",
        "0004_team_crests.up.sql",
        "0005_player_snapshots.down.sql",
        "0005_player_snapshots.up.sql",
        "0006_player_global_rank.down.sql",
        "0006_player_global_rank.up.sql",
        "0007_player_nationality.down.sql",
        "0007_player_nationality.up.sql",
        "0008_player_photo.down.sql",
        "0008_player_photo.up.sql",
        "0009_player_detailed_positions.down.sql",
        "0009_player_detailed_positions.up.sql",
    ]
    assert [path.name for path in SEEDS_DIR.glob("*.sql")] == ["001_premier_league.sql"]


def test_migrations_apply_on_empty_database(database_url: str) -> None:
    migrate_down_all(database_url)
    applied = migrate_up(database_url)
    assert applied == [
        "0001", "0002", "0003", "0004", "0005", "0006", "0007", "0008", "0009"
    ]

    with psycopg.connect(database_url) as conn:
        assert applied_versions(conn) == [
            "0001",
            "0002",
            "0003",
            "0004",
            "0005",
            "0006",
            "0007",
            "0008",
            "0009",
        ]
        tables = {
            row[0]
            for row in conn.execute(
                """
                SELECT tablename
                FROM pg_tables
                WHERE schemaname = 'public'
                  AND tablename = ANY(%s)
                """,
                (
                    [
                        "competitions",
                        "seasons",
                        "teams",
                        "fixtures",
                        "match_events",
                        "provider_references",
                        "player_snapshot_runs",
                        "player_snapshot_entries",
                        "schema_meta",
                        "schema_migrations",
                    ],
                ),
            ).fetchall()
        }
    assert tables == {
        "competitions",
        "seasons",
        "teams",
        "fixtures",
        "match_events",
        "provider_references",
        "player_snapshot_runs",
        "player_snapshot_entries",
        "schema_meta",
        "schema_migrations",
    }


def test_migrations_roll_back_safely(database_url: str) -> None:
    migrate_down_all(database_url)
    migrate_up(database_url)

    assert migrate_down(database_url, steps=1) == ["0009"]
    with psycopg.connect(database_url) as conn:
        columns = {
            row[0]
            for row in conn.execute(
                """SELECT column_name FROM information_schema.columns
                   WHERE table_schema='public' AND table_name='player_snapshot_entries'"""
            ).fetchall()
        }
        assert "positions" not in columns
        assert "photo_url" in columns

    assert migrate_down(database_url, steps=1) == ["0008"]
    with psycopg.connect(database_url) as conn:
        columns = {
            row[0]
            for row in conn.execute(
                """SELECT column_name FROM information_schema.columns
                   WHERE table_schema='public' AND table_name='player_snapshot_entries'"""
            ).fetchall()
        }
        assert "photo_url" not in columns
        assert "nationality_code" in columns

    assert migrate_down(database_url, steps=1) == ["0007"]
    with psycopg.connect(database_url) as conn:
        columns = {
            row[0]
            for row in conn.execute(
                """SELECT column_name FROM information_schema.columns
                   WHERE table_schema='public' AND table_name='player_snapshot_entries'"""
            ).fetchall()
        }
        assert "nationality_code" not in columns
        assert "global_rank" in columns

    assert migrate_down(database_url, steps=1) == ["0006"]
    with psycopg.connect(database_url) as conn:
        columns = {
            row[0]
            for row in conn.execute(
                """SELECT column_name FROM information_schema.columns
                   WHERE table_schema='public' AND table_name='player_snapshot_entries'"""
            ).fetchall()
        }
        assert "global_rank" not in columns

    assert migrate_down(database_url, steps=1) == ["0005"]
    with psycopg.connect(database_url) as conn:
        assert conn.execute("SELECT to_regclass('public.player_snapshot_entries')").fetchone() == (
            None,
        )
        assert conn.execute("SELECT to_regclass('public.player_snapshot_runs')").fetchone() == (
            None,
        )

    assert migrate_down(database_url, steps=1) == ["0004"]
    with psycopg.connect(database_url) as conn:
        assert applied_versions(conn) == ["0001", "0002", "0003"]
        assert conn.execute("SELECT to_regclass('public.fixtures')").fetchone() == ("fixtures",)

    assert migrate_down(database_url, steps=1) == ["0003"]
    with psycopg.connect(database_url) as conn:
        assert applied_versions(conn) == ["0001", "0002"]

    assert migrate_down(database_url, steps=1) == ["0002"]
    with psycopg.connect(database_url) as conn:
        assert applied_versions(conn) == ["0001"]
        remaining = {
            row[0]
            for row in conn.execute(
                """
                SELECT tablename
                FROM pg_tables
                WHERE schemaname = 'public'
                  AND tablename = ANY(%s)
                """,
                (
                    [
                        "competitions",
                        "seasons",
                        "teams",
                        "fixtures",
                        "match_events",
                        "provider_references",
                        "schema_meta",
                    ],
                ),
            ).fetchall()
        }
    assert remaining == {"schema_meta"}

    assert migrate_down(database_url, steps=1) == ["0001"]
    with psycopg.connect(database_url) as conn:
        assert applied_versions(conn) == []
        leftover = conn.execute(
            """
            SELECT tablename
            FROM pg_tables
            WHERE schemaname = 'public'
              AND tablename IN ('schema_meta', 'competitions')
            """
        ).fetchall()
    assert leftover == []


def test_seed_creates_premier_league_and_current_season(migrated_db: str) -> None:
    seed(migrated_db)
    seed(migrated_db)  # idempotent

    with psycopg.connect(migrated_db) as conn:
        competition = conn.execute(
            "SELECT code, name, country_code FROM competitions WHERE code = 'PL'"
        ).fetchone()
        assert competition == ("PL", "Premier League", "ENG")

        season = conn.execute(
            """
            SELECT s.name, s.is_current, s.start_date::text, s.end_date::text
            FROM seasons s
            JOIN competitions c ON c.id = s.competition_id
            WHERE c.code = 'PL' AND s.is_current
            """
        ).fetchone()
        assert season == ("2026/2027", True, "2026-08-14", "2027-05-31")

        current_count = conn.execute(
            """
            SELECT count(*)
            FROM seasons s
            JOIN competitions c ON c.id = s.competition_id
            WHERE c.code = 'PL' AND s.is_current
            """
        ).fetchone()
        assert current_count == (1,)


def test_teams_and_fixtures_can_be_inserted_and_queried(migrated_db: str) -> None:
    seed(migrated_db)

    with psycopg.connect(migrated_db) as conn:
        competition_id, season_id = conn.execute(
            """
            SELECT c.id, s.id
            FROM competitions c
            JOIN seasons s ON s.competition_id = c.id
            WHERE c.code = 'PL' AND s.is_current
            """
        ).fetchone()

        home_id = conn.execute(
            """
            INSERT INTO teams (name, short_name, tla)
            VALUES ('Arsenal', 'Arsenal', 'ARS')
            RETURNING id
            """
        ).fetchone()[0]
        away_id = conn.execute(
            """
            INSERT INTO teams (name, short_name, tla)
            VALUES ('Chelsea', 'Chelsea', 'CHE')
            RETURNING id
            """
        ).fetchone()[0]

        fixture_id = conn.execute(
            """
            INSERT INTO fixtures (
                competition_id,
                season_id,
                home_team_id,
                away_team_id,
                status,
                kickoff_at,
                matchday
            )
            VALUES (
                %s, %s, %s, %s, 'scheduled',
                timestamptz '2026-08-15 14:00:00+00',
                1
            )
            RETURNING id
            """,
            (competition_id, season_id, home_id, away_id),
        ).fetchone()[0]
        conn.commit()

        row = conn.execute(
            """
            SELECT
                f.status,
                home.name AS home_team,
                away.name AS away_team
            FROM fixtures f
            JOIN teams home ON home.id = f.home_team_id
            JOIN teams away ON away.id = f.away_team_id
            WHERE f.id = %s
            """,
            (fixture_id,),
        ).fetchone()
        assert row == ("scheduled", "Arsenal", "Chelsea")


def test_duplicate_provider_mappings_are_rejected(migrated_db: str) -> None:
    with psycopg.connect(migrated_db) as conn:
        team_id = conn.execute(
            "INSERT INTO teams (name) VALUES ('Liverpool') RETURNING id"
        ).fetchone()[0]
        other_team_id = conn.execute(
            "INSERT INTO teams (name) VALUES ('Everton') RETURNING id"
        ).fetchone()[0]

        conn.execute(
            """
            INSERT INTO provider_references (
                provider, entity_type, entity_id, provider_entity_id
            )
            VALUES ('test-provider', 'team', %s, 'ext-1')
            """,
            (team_id,),
        )
        conn.commit()

        with pytest.raises(UniqueViolation):
            conn.execute(
                """
                INSERT INTO provider_references (
                    provider, entity_type, entity_id, provider_entity_id
                )
                VALUES ('test-provider', 'team', %s, 'ext-1')
                """,
                (other_team_id,),
            )

        conn.rollback()

        with pytest.raises(UniqueViolation):
            conn.execute(
                """
                INSERT INTO provider_references (
                    provider, entity_type, entity_id, provider_entity_id
                )
                VALUES ('test-provider', 'team', %s, 'ext-2')
                """,
                (team_id,),
            )


def test_fixture_cannot_use_same_home_and_away_team(migrated_db: str) -> None:
    seed(migrated_db)

    with psycopg.connect(migrated_db) as conn:
        competition_id, season_id = conn.execute(
            """
            SELECT c.id, s.id
            FROM competitions c
            JOIN seasons s ON s.competition_id = c.id
            WHERE c.code = 'PL' AND s.is_current
            """
        ).fetchone()
        team_id = conn.execute(
            "INSERT INTO teams (name) VALUES ('Tottenham Hotspur') RETURNING id"
        ).fetchone()[0]

        with pytest.raises(CheckViolation):
            conn.execute(
                """
                INSERT INTO fixtures (
                    competition_id,
                    season_id,
                    home_team_id,
                    away_team_id,
                    status,
                    kickoff_at
                )
                VALUES (%s, %s, %s, %s, 'scheduled', now())
                """,
                (competition_id, season_id, team_id, team_id),
            )


def test_fixture_season_must_belong_to_competition(migrated_db: str) -> None:
    with psycopg.connect(migrated_db) as conn:
        first_competition = conn.execute(
            "INSERT INTO competitions (code, name) VALUES ('PL', 'Premier League') RETURNING id"
        ).fetchone()[0]
        second_competition = conn.execute(
            "INSERT INTO competitions (code, name) VALUES ('FAC', 'FA Cup') RETURNING id"
        ).fetchone()[0]
        season_id = conn.execute(
            """
            INSERT INTO seasons (competition_id, name, start_date, end_date)
            VALUES (%s, '2026/2027', DATE '2026-08-01', DATE '2027-05-31')
            RETURNING id
            """,
            (first_competition,),
        ).fetchone()[0]
        home_id = conn.execute(
            "INSERT INTO teams (name) VALUES ('Arsenal') RETURNING id"
        ).fetchone()[0]
        away_id = conn.execute(
            "INSERT INTO teams (name) VALUES ('Chelsea') RETURNING id"
        ).fetchone()[0]

        with pytest.raises(ForeignKeyViolation):
            conn.execute(
                """
                INSERT INTO fixtures (
                    competition_id, season_id, home_team_id, away_team_id,
                    status, kickoff_at
                )
                VALUES (%s, %s, %s, %s, 'scheduled', now())
                """,
                (second_competition, season_id, home_id, away_id),
            )


def test_completed_fixture_requires_both_scores(migrated_db: str) -> None:
    seed(migrated_db)

    with psycopg.connect(migrated_db) as conn:
        competition_id, season_id = conn.execute(
            """
            SELECT c.id, s.id
            FROM competitions c
            JOIN seasons s ON s.competition_id = c.id
            WHERE c.code = 'PL' AND s.is_current
            """
        ).fetchone()
        home_id = conn.execute(
            "INSERT INTO teams (name) VALUES ('Arsenal') RETURNING id"
        ).fetchone()[0]
        away_id = conn.execute(
            "INSERT INTO teams (name) VALUES ('Chelsea') RETURNING id"
        ).fetchone()[0]

        with pytest.raises(CheckViolation):
            conn.execute(
                """
                INSERT INTO fixtures (
                    competition_id, season_id, home_team_id, away_team_id,
                    status, kickoff_at, home_score
                )
                VALUES (%s, %s, %s, %s, 'completed', now(), 2)
                """,
                (competition_id, season_id, home_id, away_id),
            )
