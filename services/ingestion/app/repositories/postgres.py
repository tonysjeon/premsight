from __future__ import annotations

from uuid import UUID

import psycopg
from psycopg import Connection

from app.domain.models import HistoricalSnapshot, ProviderFixture, ProviderTeam, SyncResult


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
        entity_id = self._reference_id(
            conn, snapshot.provider, "fixture", fixture.provider_id
        )
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
        return entity_id

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
