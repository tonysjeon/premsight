from __future__ import annotations

import re
import unicodedata
from uuid import UUID

import psycopg
from psycopg import Connection

from app.domain.models import PlayerCatalog, PlayerSyncResult

TEAM_TLA_ALIASES = {
    ("fpl", "NFO"): "NOT",
}


def internal_team_tla(provider: str, provider_tla: str) -> str:
    return TEAM_TLA_ALIASES.get((provider, provider_tla), provider_tla)


def slugify(name: str) -> str:
    cleaned_name = (
        name.replace("Ø", "o")
        .replace("ø", "o")
        .replace("Æ", "ae")
        .replace("æ", "ae")
        .replace("ß", "ss")
        .replace("Ł", "l")
        .replace("ł", "l")
        .replace("Đ", "d")
        .replace("đ", "d")
    )
    ascii_val = (
        unicodedata.normalize("NFKD", cleaned_name)
        .encode("ascii", "ignore")
        .decode()
        .lower()
    )
    cleaned = re.sub(r"[^a-z0-9]+", "-", ascii_val).strip("-")
    return cleaned or "player"


class PostgresPlayerRosterRepository:
    def __init__(self, database_url: str) -> None:
        self._database_url = database_url

    def sync_players(self, catalog: PlayerCatalog) -> PlayerSyncResult:
        with psycopg.connect(self._database_url) as conn:
            season_id = self._current_season_id(conn)
            team_ids = self._team_ids_by_tla(conn, season_id)
            provider_teams = {
                team.provider_id: internal_team_tla(catalog.provider, team.tla)
                for team in catalog.teams
            }
            players_processed = 0
            for player in catalog.players:
                tla = provider_teams.get(player.team_provider_id)
                if not tla or tla not in team_ids:
                    continue
                team_id = team_ids[tla]

                ref_row = conn.execute(
                    """SELECT entity_id FROM provider_references
                       WHERE provider = %s AND entity_type = 'player'
                         AND provider_entity_id = %s""",
                    (catalog.provider, player.provider_id),
                ).fetchone()

                if ref_row is not None:
                    player_id = ref_row[0]
                    conn.execute(
                        """UPDATE players
                           SET first_name = %s, last_name = %s, display_name = %s,
                               nationality_code = %s, photo_url = %s, updated_at = now()
                           WHERE id = %s""",
                        (
                            player.first_name,
                            player.last_name,
                            player.display_name,
                            player.nationality_code,
                            player.photo_url,
                            player_id,
                        ),
                    )
                else:
                    slug = self._generate_unique_slug(
                        conn, f"{player.first_name} {player.last_name}"
                    )
                    player_id = conn.execute(
                        """INSERT INTO players (
                             first_name, last_name, display_name,
                             nationality_code, photo_url, slug
                           )
                           VALUES (%s, %s, %s, %s, %s, %s)
                           RETURNING id""",
                        (
                            player.first_name,
                            player.last_name,
                            player.display_name,
                            player.nationality_code,
                            player.photo_url,
                            slug,
                        ),
                    ).fetchone()[0]
                    conn.execute(
                        """INSERT INTO provider_references (
                             provider, entity_type, entity_id, provider_entity_id
                           )
                           VALUES (%s, 'player', %s, %s)""",
                        (catalog.provider, player_id, player.provider_id),
                    )

                conn.execute(
                    """INSERT INTO squad_memberships (
                         season_id, player_id, team_id, position,
                         positions, squad_number, updated_at
                       )
                       VALUES (%s, %s, %s, %s, %s, %s, now())
                       ON CONFLICT (season_id, player_id) DO UPDATE SET
                         team_id = EXCLUDED.team_id,
                         position = EXCLUDED.position,
                         positions = EXCLUDED.positions,
                         squad_number = EXCLUDED.squad_number,
                         updated_at = now()""",
                    (
                        season_id,
                        player_id,
                        team_id,
                        player.position,
                        list(player.positions),
                        player.squad_number,
                    ),
                )
                players_processed += 1
            conn.commit()
            return PlayerSyncResult(
                season_id=str(season_id),
                teams_processed=len(team_ids),
                players_processed=players_processed,
            )

    @staticmethod
    def _generate_unique_slug(
        conn: Connection, base_name: str, player_id: UUID | None = None
    ) -> str:
        base_slug = slugify(base_name)
        slug = base_slug
        suffix = 1
        while True:
            row = conn.execute(
                "SELECT id FROM players WHERE slug = %s",
                (slug,),
            ).fetchone()
            if row is None or (player_id is not None and row[0] == player_id):
                return slug
            suffix += 1
            slug = f"{base_slug}-{suffix}"

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
    def _team_ids_by_tla(conn: Connection, season_id: UUID) -> dict[str, UUID]:
        rows = conn.execute(
            """SELECT DISTINCT t.tla, t.id FROM teams t
               JOIN fixtures f ON t.id IN (f.home_team_id, f.away_team_id)
               WHERE f.season_id=%s AND t.tla IS NOT NULL ORDER BY t.tla""",
            (season_id,),
        ).fetchall()
        if not rows:
            rows = conn.execute(
                "SELECT tla, id FROM teams WHERE tla IS NOT NULL ORDER BY tla"
            ).fetchall()
        if not rows or any(not tla for tla, _ in rows):
            raise ValueError("Current-season teams must have TLA values")
        return {tla: team_id for tla, team_id in rows}
