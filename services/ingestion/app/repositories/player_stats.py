from __future__ import annotations

from uuid import UUID

import psycopg
from psycopg import Connection
from psycopg.rows import dict_row

from app.domain.models import NormalizedModel
from app.providers.fbref import FbrefSeasonStats, cb_stats_are_percentiles, fb_stats_are_percentiles
from app.services.archetypes import fit_position_clusters
from app.services.player_matcher import match_player_candidate


class PlayerStatsSyncResult(NormalizedModel):
    season_id: str
    stats_processed: int
    matched_players: int
    archetypes_generated: int = 0


class PostgresPlayerStatsRepository:
    def __init__(self, database_url: str) -> None:
        self._database_url = database_url

    def sync_stats(self, season_stats: FbrefSeasonStats) -> PlayerStatsSyncResult:
        with psycopg.connect(self._database_url) as conn:
            season_id = self._current_season_id(conn)
            db_players = self._load_players(conn, season_id)

            families = {item.position for item in season_stats.players}
            for family in families:
                conn.execute(
                    """DELETE FROM player_season_stats
                       WHERE season_id = %s AND provider = %s AND model_version = %s
                         AND position_family = %s""",
                    (
                        season_id,
                        season_stats.provider,
                        season_stats.model_version,
                        family,
                    ),
                )

            matched_count = 0
            for item in season_stats.players:
                cand = match_player_candidate(
                    query_name=item.name,
                    query_team=item.team,
                    candidates=db_players,
                )
                if cand is None:
                    continue
                if item.position == "DEF" and self._is_cb_membership(cand):
                    if not cb_stats_are_percentiles(item.stats):
                        continue
                elif item.position == "DEF" and self._is_fb_membership(cand):
                    if not fb_stats_are_percentiles(item.stats):
                        continue

                stats_payload = dict(item.stats)
                if item.scout_position:
                    stats_payload["scout_position"] = item.scout_position

                player_id = UUID(str(cand["id"]))
                conn.execute(
                    """INSERT INTO player_season_stats (
                         player_id, season_id, provider, model_version,
                         minutes, position_family, stats, features, updated_at
                       )
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, now())
                       ON CONFLICT (player_id, season_id, provider, model_version) DO UPDATE SET
                         minutes = EXCLUDED.minutes,
                         position_family = EXCLUDED.position_family,
                         stats = EXCLUDED.stats,
                         features = EXCLUDED.features,
                         updated_at = now()""",
                    (
                        player_id,
                        season_id,
                        season_stats.provider,
                        season_stats.model_version,
                        item.minutes,
                        item.position,
                        psycopg.types.json.Jsonb(stats_payload),
                        item.features,
                    ),
                )
                matched_count += 1

            # Ingest-time position-family k-means archetypes
            archetypes_count = self._sync_archetypes(
                conn, season_id, season_stats.model_version
            )

            conn.commit()
            return PlayerStatsSyncResult(
                season_id=str(season_id),
                stats_processed=len(season_stats.players),
                matched_players=matched_count,
                archetypes_generated=archetypes_count,
            )

    def _sync_archetypes(
        self,
        conn: Connection,
        season_id: UUID,
        model_version: str,
    ) -> int:
        with conn.cursor(row_factory=dict_row) as cur:
            rows = cur.execute(
                """SELECT pss.player_id, sm.position, pss.features
                   FROM player_season_stats pss
                   JOIN squad_memberships sm ON sm.player_id = pss.player_id
                        AND sm.season_id = pss.season_id
                   WHERE pss.season_id = %s AND pss.model_version = %s""",
                (season_id, model_version),
            ).fetchall()

        if not rows:
            return 0

        player_data = [
            {
                "player_id": r["player_id"],
                "position": r["position"] or "MID",
                "features": r["features"],
            }
            for r in rows
        ]

        archetypes = fit_position_clusters(player_data)
        for item in archetypes:
            conn.execute(
                """INSERT INTO player_archetypes (
                     player_id, season_id, model_version, position_family,
                     cluster_id, cluster_label, created_at
                   )
                   VALUES (%s, %s, %s, %s, %s, %s, now())
                   ON CONFLICT (player_id, season_id, model_version) DO UPDATE SET
                     position_family = EXCLUDED.position_family,
                     cluster_id = EXCLUDED.cluster_id,
                     cluster_label = EXCLUDED.cluster_label""",
                (
                    item["player_id"],
                    season_id,
                    model_version,
                    item["position_family"],
                    item["cluster_id"],
                    item["cluster_label"],
                ),
            )

        return len(archetypes)

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
    def _is_cb_membership(candidate: dict) -> bool:
        if candidate.get("position") != "DEF":
            return False
        positions = list(candidate.get("positions") or [])
        primary = next(
            (item for item in positions if item != "DEF"),
            positions[0] if positions else "DEF",
        )
        return primary in {"CB", "DEF"}

    @staticmethod
    def _is_fb_membership(candidate: dict) -> bool:
        if candidate.get("position") != "DEF":
            return False
        positions = list(candidate.get("positions") or [])
        primary = next(
            (item for item in positions if item != "DEF"),
            positions[0] if positions else "DEF",
        )
        return primary in {"LB", "LWB", "RB", "RWB"}

    @staticmethod
    def _load_players(conn: Connection, season_id: UUID) -> list[dict]:
        with conn.cursor(row_factory=dict_row) as cur:
            return cur.execute(
                """SELECT p.id, p.first_name, p.last_name, p.display_name,
                          sm.position, sm.positions, t.tla AS team_tla, t.name AS team_name
                   FROM players p
                   JOIN squad_memberships sm ON sm.player_id = p.id
                   JOIN teams t ON t.id = sm.team_id
                   WHERE sm.season_id = %s""",
                (season_id,),
            ).fetchall()
