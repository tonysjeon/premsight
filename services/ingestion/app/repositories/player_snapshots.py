from __future__ import annotations

from uuid import UUID

import psycopg
from psycopg import Connection

from app.domain.models import PlayerSnapshot, PlayerSnapshotResult

TEAM_TLA_ALIASES = {
    ("fpl", "NFO"): "NOT",
}


def internal_team_tla(provider: str, provider_tla: str) -> str:
    return TEAM_TLA_ALIASES.get((provider, provider_tla), provider_tla)


class PostgresPlayerSnapshotRepository:
    def __init__(self, database_url: str) -> None:
        self._database_url = database_url

    def save(self, snapshot: PlayerSnapshot) -> PlayerSnapshotResult:
        with psycopg.connect(self._database_url) as conn:
            season_id = self._current_season_id(conn)
            team_ids = self._current_team_ids_by_tla(conn, season_id)
            provider_teams = {
                internal_team_tla(snapshot.provider, team.tla): team for team in snapshot.teams
            }
            if set(provider_teams) != set(team_ids):
                missing = sorted(set(team_ids) - set(provider_teams))
                extra = sorted(set(provider_teams) - set(team_ids))
                raise ValueError(f"FPL team mapping mismatch; missing={missing}, extra={extra}")

            snapshot_id = conn.execute(
                """INSERT INTO player_snapshot_runs(season_id,provider,captured_at)
                   VALUES(%s,%s,%s) RETURNING id""",
                (season_id, snapshot.provider, snapshot.captured_at),
            ).fetchone()[0]
            players_processed = 0
            for tla, team_id in team_ids.items():
                provider_team = provider_teams[tla]
                selected = snapshot.players_by_team[provider_team.provider_id]
                for entry in selected:
                    player = entry.player
                    conn.execute(
                        """INSERT INTO player_snapshot_entries(
                             snapshot_id,team_id,provider_player_id,first_name,last_name,
                             display_name,position,nationality_code,photo_url,club_rank,global_rank)
                           VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                        (
                            snapshot_id,
                            team_id,
                            player.provider_id,
                            player.first_name,
                            player.last_name,
                            player.display_name,
                            player.position,
                            player.nationality_code,
                            player.photo_url,
                            entry.club_rank,
                            entry.global_rank,
                        ),
                    )
                    players_processed += 1
        return PlayerSnapshotResult(
            snapshot_id=str(snapshot_id),
            season_id=str(season_id),
            teams_processed=len(team_ids),
            players_processed=players_processed,
        )

    @staticmethod
    def _current_season_id(conn: Connection) -> UUID:
        row = conn.execute(
            """SELECT s.id FROM seasons s JOIN competitions c ON c.id=s.competition_id
               WHERE c.code='PL' AND s.is_current ORDER BY s.start_date DESC LIMIT 1"""
        ).fetchone()
        if row is None:
            raise ValueError("Current Premier League season not found")
        return row[0]

    @staticmethod
    def _current_team_ids_by_tla(conn: Connection, season_id: UUID) -> dict[str, UUID]:
        rows = conn.execute(
            """SELECT DISTINCT t.tla,t.id FROM teams t
               JOIN fixtures f ON t.id IN (f.home_team_id,f.away_team_id)
               WHERE f.season_id=%s ORDER BY t.tla""",
            (season_id,),
        ).fetchall()
        if not rows or any(not tla for tla, _ in rows):
            raise ValueError("Current-season teams must have TLA values")
        return {tla: team_id for tla, team_id in rows}
