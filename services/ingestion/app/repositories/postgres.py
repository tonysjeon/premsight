from __future__ import annotations

from datetime import datetime
from uuid import UUID

import psycopg
from psycopg import Connection
from psycopg.types.json import Json

from app.domain.models import (
    HistoricalSnapshot,
    ProviderFixture,
    ProviderMatchEvent,
    ProviderTeam,
    SyncResult,
)
from app.services.match_window import FixtureClock


class PostgresHistoricalRepository:
    def __init__(self, database_url: str) -> None:
        self._database_url = database_url

    def sync_snapshot(self, snapshot: HistoricalSnapshot) -> SyncResult:
        with psycopg.connect(self._database_url) as conn:
            competition_id = self._upsert_competition(conn, snapshot)
            season_id = self._upsert_season(conn, snapshot, competition_id)
            team_ids = {
                team.provider_id: self._upsert_team(conn, snapshot.provider, team)
                for team in snapshot.teams
            }
            for fixture in snapshot.fixtures:
                self._upsert_fixture(
                    conn,
                    snapshot,
                    fixture,
                    competition_id,
                    season_id,
                    team_ids,
                )
        return SyncResult(
            competition_id=str(competition_id),
            season_id=str(season_id),
            teams_processed=len(snapshot.teams),
            fixtures_processed=len(snapshot.fixtures),
        )

    def list_fixture_clocks(self, competition_code: str) -> tuple[FixtureClock, ...]:
        with psycopg.connect(self._database_url) as conn:
            rows = conn.execute(
                """
                SELECT f.status, f.kickoff_at
                FROM fixtures f
                JOIN seasons s ON s.id = f.season_id
                JOIN competitions c ON c.id = f.competition_id
                WHERE c.code = %s AND s.is_current
                """,
                (competition_code,),
            ).fetchall()
        return tuple(FixtureClock(status=row[0], kickoff_at=row[1]) for row in rows)

    def last_fixture_write(self, competition_code: str) -> datetime | None:
        with psycopg.connect(self._database_url) as conn:
            row = conn.execute(
                """
                SELECT MAX(f.updated_at)
                FROM fixtures f
                JOIN seasons s ON s.id = f.season_id
                JOIN competitions c ON c.id = f.competition_id
                WHERE c.code = %s AND s.is_current
                """,
                (competition_code,),
            ).fetchone()
        if row is None or row[0] is None:
            return None
        return row[0]

    def apply_match_results(self, provider: str, fixtures: tuple[ProviderFixture, ...]) -> int:
        updated = 0
        with psycopg.connect(self._database_url) as conn:
            for fixture in fixtures:
                row = conn.execute(
                    """
                    SELECT f.id, f.status, f.home_score, f.away_score
                    FROM fixtures f
                    JOIN provider_references r
                      ON r.entity_id = f.id
                     AND r.entity_type = 'fixture'
                     AND r.provider = %s
                    WHERE r.provider_entity_id = %s
                    """,
                    (provider, fixture.provider_id),
                ).fetchone()
                if row is None:
                    continue
                fixture_id, status, home_score, away_score = row
                if status == "completed" and home_score is not None and away_score is not None:
                    continue
                conn.execute(
                    """
                    UPDATE fixtures
                    SET status = %s, kickoff_at = %s, matchday = %s,
                        home_score = %s, away_score = %s, updated_at = now()
                    WHERE id = %s
                    """,
                    (
                        fixture.status,
                        fixture.kickoff_at,
                        fixture.matchday,
                        fixture.home_score,
                        fixture.away_score,
                        fixture_id,
                    ),
                )
                team_ids = self._team_ids(conn, provider, fixture)
                self._replace_events(conn, fixture_id, fixture, team_ids)
                updated += 1
        return updated

    def _team_ids(
        self,
        conn: Connection,
        provider: str,
        fixture: ProviderFixture,
    ) -> dict[str, UUID]:
        ids: dict[str, UUID] = {}
        for provider_id in (fixture.home_team_provider_id, fixture.away_team_provider_id):
            entity_id = self._reference_id(conn, provider, "team", provider_id)
            if entity_id is not None:
                ids[provider_id] = entity_id
        return ids

    def _upsert_competition(self, conn: Connection, snapshot: HistoricalSnapshot) -> UUID:
        item = snapshot.competition
        entity_id = self._reference_id(conn, snapshot.provider, "competition", item.provider_id)
        if entity_id is None:
            entity_id = conn.execute(
                """
                INSERT INTO competitions (code, name, country_code)
                VALUES (%s, %s, %s)
                ON CONFLICT (code) DO UPDATE SET
                    name = EXCLUDED.name,
                    country_code = EXCLUDED.country_code,
                    updated_at = now()
                RETURNING id
                """,
                (item.code, item.name, item.country_code),
            ).fetchone()[0]
            self._insert_reference(
                conn, snapshot.provider, "competition", entity_id, item.provider_id
            )
        else:
            conn.execute(
                """
                UPDATE competitions
                SET code = %s, name = %s, country_code = %s, updated_at = now()
                WHERE id = %s
                """,
                (item.code, item.name, item.country_code, entity_id),
            )
        return entity_id

    def _upsert_season(
        self,
        conn: Connection,
        snapshot: HistoricalSnapshot,
        competition_id: UUID,
    ) -> UUID:
        item = snapshot.season
        entity_id = self._reference_id(conn, snapshot.provider, "season", item.provider_id)
        if entity_id is None:
            entity_id = conn.execute(
                """
                INSERT INTO seasons (
                    competition_id, name, start_date, end_date, is_current
                )
                VALUES (%s, %s, %s, %s, FALSE)
                ON CONFLICT (competition_id, name) DO UPDATE SET
                    start_date = EXCLUDED.start_date,
                    end_date = EXCLUDED.end_date,
                    updated_at = now()
                RETURNING id
                """,
                (competition_id, item.name, item.start_date, item.end_date),
            ).fetchone()[0]
            self._insert_reference(conn, snapshot.provider, "season", entity_id, item.provider_id)
        else:
            conn.execute(
                """
                UPDATE seasons
                SET competition_id = %s, name = %s, start_date = %s,
                    end_date = %s, updated_at = now()
                WHERE id = %s
                """,
                (competition_id, item.name, item.start_date, item.end_date, entity_id),
            )
        return entity_id

    def _upsert_team(
        self,
        conn: Connection,
        provider: str,
        team: ProviderTeam,
    ) -> UUID:
        entity_id = self._reference_id(conn, provider, "team", team.provider_id)
        if entity_id is None:
            # If team already exists with same name or tla, reuse it
            existing = None
            if team.tla:
                existing = conn.execute(
                    "SELECT id FROM teams WHERE tla = %s LIMIT 1", (team.tla,)
                ).fetchone()
            if existing is None:
                existing = conn.execute(
                    "SELECT id FROM teams WHERE name = %s LIMIT 1", (team.name,)
                ).fetchone()

            if existing is not None:
                entity_id = existing[0]
            else:
                entity_id = conn.execute(
                    """
                    INSERT INTO teams (name, short_name, tla, crest_url)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id
                    """,
                    (team.name, team.short_name, team.tla, team.crest_url),
                ).fetchone()[0]
            self._insert_reference(conn, provider, "team", entity_id, team.provider_id)
        else:
            conn.execute(
                """
                UPDATE teams
                SET name = %s, short_name = %s, tla = %s, crest_url = %s, updated_at = now()
                WHERE id = %s
                """,
                (team.name, team.short_name, team.tla, team.crest_url, entity_id),
            )
        return entity_id

    def _upsert_fixture(
        self,
        conn: Connection,
        snapshot: HistoricalSnapshot,
        fixture: ProviderFixture,
        competition_id: UUID,
        season_id: UUID,
        team_ids: dict[str, UUID],
    ) -> UUID:
        entity_id = self._reference_id(conn, snapshot.provider, "fixture", fixture.provider_id)
        values = (
            competition_id,
            season_id,
            team_ids[fixture.home_team_provider_id],
            team_ids[fixture.away_team_provider_id],
            fixture.status,
            fixture.kickoff_at,
            fixture.matchday,
            fixture.home_score,
            fixture.away_score,
            fixture.venue,
        )
        if entity_id is None:
            entity_id = conn.execute(
                """
                INSERT INTO fixtures (
                    competition_id, season_id, home_team_id, away_team_id,
                    status, kickoff_at, matchday, home_score, away_score, venue
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                values,
            ).fetchone()[0]
            self._insert_reference(
                conn, snapshot.provider, "fixture", entity_id, fixture.provider_id
            )
        else:
            conn.execute(
                """
                UPDATE fixtures SET
                    competition_id = %s, season_id = %s, home_team_id = %s,
                    away_team_id = %s, status = %s, kickoff_at = %s,
                    matchday = %s, home_score = %s, away_score = %s,
                    venue = %s, updated_at = now()
                WHERE id = %s
                """,
                (*values, entity_id),
            )
        self._replace_events(conn, entity_id, fixture, team_ids)
        return entity_id

    def _replace_events(
        self,
        conn: Connection,
        fixture_id: UUID,
        fixture: ProviderFixture,
        team_ids: dict[str, UUID],
    ) -> None:
        conn.execute("DELETE FROM match_events WHERE fixture_id = %s", (fixture_id,))
        for sort_key, event in enumerate(fixture.events):
            team_id = team_ids.get(event.team_provider_id) if event.team_provider_id else None
            detail = self._event_detail(event)
            conn.execute(
                """
                INSERT INTO match_events (
                    fixture_id, event_type, minute, extra_minute, period, team_id,
                    player_name, related_player_name, detail, sort_key
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    fixture_id,
                    event.event_type,
                    event.minute,
                    event.extra_minute,
                    event.period,
                    team_id,
                    event.player_name,
                    event.related_player_name,
                    Json(detail) if detail else None,
                    sort_key,
                ),
            )

    @staticmethod
    def _event_detail(event: ProviderMatchEvent) -> dict[str, object]:
        detail: dict[str, object] = {}
        if event.goal_type is not None:
            detail["goal_type"] = event.goal_type
        if event.card_type is not None:
            detail["card_type"] = event.card_type
        if event.home_score is not None and event.away_score is not None:
            detail["score"] = {"home": event.home_score, "away": event.away_score}
        return detail

    @staticmethod
    def _reference_id(
        conn: Connection,
        provider: str,
        entity_type: str,
        provider_entity_id: str,
    ) -> UUID | None:
        row = conn.execute(
            """
            SELECT entity_id
            FROM provider_references
            WHERE provider = %s AND entity_type = %s AND provider_entity_id = %s
            """,
            (provider, entity_type, provider_entity_id),
        ).fetchone()
        return row[0] if row else None

    @staticmethod
    def _insert_reference(
        conn: Connection,
        provider: str,
        entity_type: str,
        entity_id: UUID,
        provider_entity_id: str,
    ) -> None:
        conn.execute(
            """
            INSERT INTO provider_references (
                provider, entity_type, entity_id, provider_entity_id
            )
            VALUES (%s, %s, %s, %s)
            """,
            (provider, entity_type, entity_id, provider_entity_id),
        )
