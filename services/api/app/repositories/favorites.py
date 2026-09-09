from datetime import UTC, datetime
from typing import Any

import psycopg
from psycopg.rows import dict_row

from app.core.roster import enrich_team_roster


class FavoritesRepository:
    def __init__(self, database_url: str) -> None:
        self.database_url = database_url

    def players(self, user_id: str) -> list[dict[str, Any]]:
        with psycopg.connect(self.database_url, row_factory=dict_row) as conn:
            rows = conn.execute(
                """SELECT p.*, sm.position, sm.positions, sm.squad_number,
                          t.tla AS team_tla, t.name AS team_name
                   FROM player_favorites f JOIN players p ON p.id=f.player_id
                   LEFT JOIN LATERAL (
                       SELECT m.* FROM squad_memberships m
                       JOIN seasons s ON s.id=m.season_id
                       WHERE m.player_id=p.id ORDER BY s.is_current DESC, s.name DESC LIMIT 1
                   ) sm ON true
                   LEFT JOIN teams t ON t.id=sm.team_id
                   WHERE f.user_id=%s ORDER BY f.created_at DESC, p.id""",
                (user_id,),
            ).fetchall()
            season = conn.execute(
                """SELECT s.name FROM seasons s JOIN competitions c ON c.id=s.competition_id
                   WHERE s.is_current AND c.code='PL'"""
            ).fetchone()
        if season:
            enriched = enrich_team_roster(rows, "PL", season["name"], datetime.now(UTC).date())
            by_id = {p["id"]: p for p in enriched}
            return [by_id[p["id"]] for p in rows]
        return rows

    def teams(self, user_id: str) -> list[dict[str, Any]]:
        with psycopg.connect(self.database_url, row_factory=dict_row) as conn:
            return conn.execute(
                """SELECT t.* FROM team_favorites f JOIN teams t ON t.id=f.team_id
                   WHERE f.user_id=%s ORDER BY f.created_at DESC, t.id""",
                (user_id,),
            ).fetchall()

    def follow(self, user_id: str, team_id: str) -> bool:
        with psycopg.connect(self.database_url) as conn:
            if not conn.execute("SELECT 1 FROM teams WHERE id=%s", (team_id,)).fetchone():
                return False
            conn.execute(
                "INSERT INTO team_favorites(user_id, team_id) VALUES (%s,%s) "
                "ON CONFLICT DO NOTHING", (user_id, team_id),
            )
        return True

    def unfollow(self, user_id: str, team_id: str) -> None:
        with psycopg.connect(self.database_url) as conn:
            conn.execute(
                "DELETE FROM team_favorites WHERE user_id=%s AND team_id=%s",
                (user_id, team_id),
            )

    def save(self, user_id: str, player_id: str) -> bool:
        with psycopg.connect(self.database_url) as conn:
            exists = conn.execute("SELECT 1 FROM players WHERE id=%s", (player_id,)).fetchone()
            if not exists:
                return False
            conn.execute(
                "INSERT INTO player_favorites(user_id, player_id) VALUES (%s,%s) "
                "ON CONFLICT DO NOTHING", (user_id, player_id),
            )
        return True

    def remove(self, user_id: str, player_id: str) -> None:
        with psycopg.connect(self.database_url) as conn:
            conn.execute(
                "DELETE FROM player_favorites WHERE user_id=%s AND player_id=%s",
                (user_id, player_id),
            )
