from datetime import datetime
from typing import Any
from uuid import UUID

import psycopg
from psycopg.rows import dict_row

from app.core.public_ids import (
    parse_uuid,
    season_key_matches,
    with_season_slug,
    with_team_slug,
)
from app.scout import (
    SCOUT_FAMILIES,
    SCOUT_SLOTS,
    match_scout_rows,
    scout_slot,
    scout_stats_for_player,
)


class FootballRepository:
    def __init__(self, database_url: str) -> None:
        self._database_url = database_url

    def _all(self, query: str, params: tuple[object, ...] = ()) -> list[dict[str, Any]]:
        with psycopg.connect(self._database_url, row_factory=dict_row) as conn:
            return list(conn.execute(query, params).fetchall())

    def _one(self, query: str, params: tuple[object, ...] = ()) -> dict[str, Any] | None:
        with psycopg.connect(self._database_url, row_factory=dict_row) as conn:
            return conn.execute(query, params).fetchone()

    def current_season(self) -> dict[str, Any] | None:
        item = self._one(
            """SELECT s.id, s.competition_id, c.name competition_name, s.name,
                      s.start_date, s.end_date, s.is_current
               FROM seasons s JOIN competitions c ON c.id=s.competition_id
               WHERE s.is_current ORDER BY s.start_date DESC LIMIT 1"""
        )
        return None if item is None else with_season_slug(item)

    def seasons(self) -> list[dict[str, Any]]:
        return [
            with_season_slug(item)
            for item in self._all(
                """SELECT s.id, s.competition_id, c.name competition_name, s.name,
                          s.start_date, s.end_date, s.is_current
                   FROM seasons s JOIN competitions c ON c.id=s.competition_id
                   ORDER BY s.start_date DESC"""
            )
        ]

    def resolve_season_id(self, key: str) -> UUID | None:
        parsed = parse_uuid(key)
        if parsed is not None:
            item = self._one("SELECT id FROM seasons WHERE id=%s", (parsed,))
            return None if item is None else item["id"]
        for season in self.seasons():
            if season_key_matches(str(season["name"]), key):
                season_id = season["id"]
                return season_id if isinstance(season_id, UUID) else UUID(str(season_id))
        return None

    def resolve_team_id(self, key: str) -> UUID | None:
        item = self.team(key)
        if item is None:
            return None
        team_id = item["id"]
        return team_id if isinstance(team_id, UUID) else UUID(str(team_id))

    def teams(self, season_id: UUID | None = None) -> list[dict[str, Any]]:
        if season_id is None:
            rows = self._all("SELECT id,name,short_name,tla,crest_url FROM teams ORDER BY name")
        else:
            rows = self._all(
                """SELECT DISTINCT t.id,t.name,t.short_name,t.tla,t.crest_url FROM teams t
                   JOIN fixtures f ON t.id IN (f.home_team_id,f.away_team_id)
                   WHERE f.season_id=%s ORDER BY t.name""",
                (season_id,),
            )
        return [with_team_slug(item) for item in rows]

    def team(self, team_id: str | UUID) -> dict[str, Any] | None:
        key = str(team_id)
        parsed = parse_uuid(key)
        item = (
            self._one("SELECT id,name,short_name,tla,crest_url FROM teams WHERE id=%s", (parsed,))
            if parsed is not None
            else self._one(
                "SELECT id,name,short_name,tla,crest_url FROM teams WHERE upper(tla)=upper(%s)",
                (key,),
            )
        )
        return None if item is None else with_team_slug(item)

    def fixtures(
        self, season_id: UUID | None = None, status: str | None = None, team_id: UUID | None = None
    ) -> list[dict[str, Any]]:
        clauses: list[str] = []
        params: list[object] = []
        if season_id:
            clauses.append("f.season_id=%s")
            params.append(season_id)
        if status:
            clauses.append("f.status=%s")
            params.append(status)
        if team_id:
            clauses.append("%s IN (f.home_team_id,f.away_team_id)")
            params.append(team_id)
        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        return self._all(self._fixture_select() + where + " ORDER BY f.kickoff_at", tuple(params))

    def fixture(self, fixture_id: UUID) -> dict[str, Any] | None:
        item = self._one(self._fixture_select() + " WHERE f.id=%s", (fixture_id,))
        if item is None:
            return None
        item["events"] = self._all(
            """SELECT id, event_type, minute, extra_minute, period, team_id,
                      player_name, related_player_name, detail
               FROM match_events WHERE fixture_id=%s ORDER BY sort_key""",
            (fixture_id,),
        )
        return item

    def prediction_history(
        self, competition_id: UUID, before_kickoff: datetime
    ) -> list[dict[str, Any]]:
        return self._all(
            """SELECT home_team_id::text, away_team_id::text, home_score, away_score
               FROM fixtures
               WHERE competition_id=%s AND kickoff_at<%s AND status='completed'
                 AND home_score IS NOT NULL AND away_score IS NOT NULL
               ORDER BY kickoff_at""",
            (competition_id, before_kickoff),
        )

    def standings(self, season_id: UUID) -> list[dict[str, Any]]:
        return self._all(
            """WITH season_teams AS (
                 SELECT home_team_id team_id FROM fixtures WHERE season_id=%s
                 UNION
                 SELECT away_team_id FROM fixtures WHERE season_id=%s
               ), results AS (
                 SELECT home_team_id team_id,1 played,(home_score>away_score)::int won,
                   (home_score=away_score)::int drawn,(home_score<away_score)::int lost,
                   home_score gf,away_score ga FROM fixtures
                   WHERE season_id=%s AND status='completed'
                 UNION ALL
                 SELECT away_team_id,1,(away_score>home_score)::int,(away_score=home_score)::int,
                   (away_score<home_score)::int,away_score,home_score
                   FROM fixtures WHERE season_id=%s AND status='completed'
               ), totals AS (
                 SELECT team_id,sum(played)::int played,sum(won)::int won,sum(drawn)::int drawn,
                   sum(lost)::int lost,sum(gf)::int goals_for,sum(ga)::int goals_against,
                   (sum(gf)-sum(ga))::int goal_difference,(sum(won)*3+sum(drawn))::int points
                 FROM results GROUP BY team_id
               ) SELECT row_number() OVER (
                   ORDER BY coalesce(points,0) DESC,coalesce(goal_difference,0) DESC,
                     coalesce(goals_for,0) DESC,t.name
                 )::int position,
                   t.id team_id,t.name team_name,coalesce(played,0)::int played,
                   coalesce(won,0)::int won,coalesce(drawn,0)::int drawn,
                   coalesce(lost,0)::int lost,coalesce(goals_for,0)::int goals_for,
                   coalesce(goals_against,0)::int goals_against,
                   coalesce(goal_difference,0)::int goal_difference,coalesce(points,0)::int points
                 FROM season_teams s JOIN teams t ON t.id=s.team_id
                 LEFT JOIN totals x ON x.team_id=s.team_id
                 ORDER BY position""",
            (season_id, season_id, season_id, season_id),
        )

    def latest_player_snapshot(self) -> dict[str, Any] | None:
        snapshot = self._one(
            """SELECT r.id,r.season_id,r.provider,r.captured_at
               FROM player_snapshot_runs r
               JOIN seasons s ON s.id=r.season_id
               JOIN competitions c ON c.id=s.competition_id
               WHERE s.is_current AND c.code='PL'
               ORDER BY r.captured_at DESC,r.created_at DESC LIMIT 1"""
        )
        if snapshot is None:
            return None
        snapshot["players"] = self._all(
            """SELECT e.provider_player_id id,e.first_name,e.last_name,e.display_name,
                      e.position,e.positions,e.nationality_code,e.photo_url,
                      e.club_rank,e.global_rank,e.ea_rating,e.rating_model_version,e.team_id,
                      t.name team_name,
                      t.crest_url team_crest_url
               FROM player_snapshot_entries e JOIN teams t ON t.id=e.team_id
               WHERE e.snapshot_id=%s
                 AND (e.position='GK' OR e.positions[1] NOT IN ('GK','DEF','MID','FWD'))
               ORDER BY t.name,e.club_rank""",
            (snapshot["id"],),
        )
        snapshot["count"] = len(snapshot["players"])
        return snapshot

    def resolve_player_id(self, key: str) -> UUID | None:
        parsed = parse_uuid(key)
        if parsed is not None:
            item = self._one("SELECT id FROM players WHERE id=%s", (parsed,))
            return None if item is None else item["id"]
        item = self._one("SELECT id FROM players WHERE slug=%s", (key.lower(),))
        return None if item is None else item["id"]

    def _squad_players(
        self,
        season_id: UUID | None = None,
        team_id: UUID | None = None,
        family: str | None = None,
    ) -> list[dict[str, Any]]:
        clauses: list[str] = []
        params: list[object] = []
        if season_id:
            clauses.append("sm.season_id = %s")
            params.append(season_id)
        if team_id:
            clauses.append("sm.team_id = %s")
            params.append(team_id)
        if family:
            clauses.append("sm.position = %s")
            params.append(family)
        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        return self._all(
            f"""SELECT p.id, p.first_name, p.last_name, p.display_name,
                       p.nationality_code, p.photo_url, p.slug,
                       sm.position, sm.positions, sm.squad_number, sm.season_id,
                       t.id AS team_id, t.name AS team_name, t.short_name AS team_short_name,
                       t.tla AS team_tla, t.crest_url AS team_crest_url
                FROM players p
                JOIN squad_memberships sm ON sm.player_id = p.id
                JOIN teams t ON t.id = sm.team_id
                {where}
                ORDER BY t.name, sm.squad_number NULLS LAST, p.display_name""",
            tuple(params),
        )

    def _target_season(
        self, season_id: UUID | None, team_id: UUID | None
    ) -> UUID | None:
        if season_id is not None:
            return season_id
        if team_id is None:
            curr = self.current_season()
            if curr is not None:
                return curr["id"]
        return None

    def _scout_candidates(
        self,
        season_id: UUID | None,
        team_id: UUID | None,
        family: str | None,
        squad: list[dict[str, Any]] | None = None,
    ) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        all_rows = (
            squad
            if squad is not None
            else self._squad_players(self._target_season(season_id, team_id), team_id, None)
        )
        if not family:
            return all_rows, all_rows
        family_rows = [row for row in all_rows if row.get("position") == family]
        return family_rows, all_rows

    def scout_players(
        self,
        slot: str,
        season_id: UUID | None = None,
        team_id: UUID | None = None,
        q: str | None = None,
        squad: list[dict[str, Any]] | None = None,
    ) -> list[dict[str, Any]]:
        family_rows, extra = self._scout_candidates(
            season_id, team_id, SCOUT_FAMILIES.get(slot), squad
        )
        return match_scout_rows(slot, family_rows, extra, q)

    def _merge_scout_players(
        self,
        slots: tuple[str, ...],
        season_id: UUID | None = None,
        team_id: UUID | None = None,
        q: str | None = None,
    ) -> list[dict[str, Any]]:
        target_season = self._target_season(season_id, team_id)
        squad = self._squad_players(target_season, team_id, None)
        seen_ids: set[str] = set()
        combined: list[dict[str, Any]] = []
        for slot in slots:
            for item in self.scout_players(slot, season_id, team_id, q, squad=squad):
                pid = str(item.get("id"))
                if pid not in seen_ids:
                    seen_ids.add(pid)
                    combined.append(item)
        return combined

    def players(
        self,
        season_id: UUID | None = None,
        team_id: UUID | None = None,
        q: str | None = None,
        position: str | None = None,
        has_stats: bool = False,
    ) -> list[dict[str, Any]]:
        if has_stats:
            slot = scout_slot(position)
            if slot:
                return self.scout_players(slot, season_id, team_id, q)
            family = (position or "").upper()
            if family == "DEF":
                return self._merge_scout_players(("CB", "FB"), season_id, team_id, q)
            if family in {"ATT", "FWD"}:
                return self._merge_scout_players(("ST", "WG"), season_id, team_id, q)
            if not position:
                return self._merge_scout_players(tuple(SCOUT_SLOTS), season_id, team_id, q)
        clauses: list[str] = []
        params: list[object] = []
        target_season = self._target_season(season_id, team_id)
        if target_season:
            clauses.append("sm.season_id = %s")
            params.append(target_season)
        if team_id:
            clauses.append("sm.team_id = %s")
            params.append(team_id)
        if q and q.strip():
            clauses.append(
                "(p.display_name ILIKE %s OR p.first_name ILIKE %s OR p.last_name ILIKE %s)"
            )
            pattern = f"%{q.strip()}%"
            params.extend([pattern, pattern, pattern])
        if position:
            raw = position.upper()
            family = "FWD" if raw in {"ATT", "FWD"} else raw
            if family in {"GK", "DEF", "MID", "FWD"}:
                clauses.append("sm.position = %s")
                params.append(family)
        stats_join = ""
        if has_stats:
            stats_join = """
                JOIN player_season_stats pss
                  ON pss.player_id = p.id AND pss.season_id = sm.season_id
                 AND cardinality(pss.features) > 0"""
        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        return self._all(
            f"""SELECT p.id, p.first_name, p.last_name, p.display_name,
                       p.nationality_code, p.photo_url, p.slug,
                       sm.position, sm.positions, sm.squad_number, sm.season_id,
                       t.id AS team_id, t.name AS team_name, t.short_name AS team_short_name,
                       t.tla AS team_tla, t.crest_url AS team_crest_url
                FROM players p
                JOIN squad_memberships sm ON sm.player_id = p.id
                JOIN teams t ON t.id = sm.team_id
                {stats_join}
                {where}
                ORDER BY t.name, sm.squad_number NULLS LAST, p.display_name""",
            tuple(params),
        )

    def player(
        self, player_id: str | UUID, season_id: UUID | None = None
    ) -> dict[str, Any] | None:
        key = str(player_id)
        parsed = parse_uuid(key)
        p = (
            self._one(
                """SELECT id, first_name, last_name, display_name, nationality_code, photo_url, slug
                   FROM players WHERE id = %s""",
                (parsed,),
            )
            if parsed is not None
            else self._one(
                """SELECT id, first_name, last_name, display_name, nationality_code, photo_url, slug
                   FROM players WHERE slug = %s""",
                (key.lower(),),
            )
        )
        if p is None:
            return None
        target_player_id = p["id"]
        membership_sql = (
            """SELECT sm.position, sm.positions, sm.squad_number, sm.season_id,
                      t.id AS team_id, t.name AS team_name, t.short_name AS team_short_name,
                      t.tla AS team_tla, t.crest_url AS team_crest_url
               FROM squad_memberships sm
               JOIN teams t ON t.id = sm.team_id
               WHERE sm.player_id = %s AND sm.season_id = %s"""
            if season_id
            else """SELECT sm.position, sm.positions, sm.squad_number, sm.season_id,
                           t.id AS team_id, t.name AS team_name, t.short_name AS team_short_name,
                           t.tla AS team_tla, t.crest_url AS team_crest_url
                    FROM squad_memberships sm
                    JOIN teams t ON t.id = sm.team_id
                    JOIN seasons s ON s.id = sm.season_id
                    WHERE sm.player_id = %s
                    ORDER BY s.is_current DESC, s.start_date DESC LIMIT 1"""
        )
        params = (target_player_id, season_id) if season_id else (target_player_id,)
        membership = self._one(membership_sql, params)
        if membership:
            p.update(membership)
        stats = self._one(
            """SELECT minutes, stats, features, provider, model_version
               FROM player_season_stats
               WHERE player_id = %s
               ORDER BY created_at DESC LIMIT 1""",
            (target_player_id,),
        )
        overlay = scout_stats_for_player(p)
        if overlay:
            p["season_stats"] = overlay["season_stats"]
            if overlay.get("scout_position"):
                p["scout_position"] = overlay["scout_position"]
        else:
            p["season_stats"] = stats
            if stats and isinstance(stats.get("stats"), dict):
                scout = stats["stats"].get("scout_position")
                if isinstance(scout, str) and scout.strip():
                    p["scout_position"] = scout.strip().upper()
        archetype = self._one(
            """SELECT position_family, cluster_id, cluster_label, model_version
               FROM player_archetypes
               WHERE player_id = %s
               ORDER BY created_at DESC LIMIT 1""",
            (target_player_id,),
        )
        p["archetype"] = archetype
        return p

    def team_roster(
        self, team_id: UUID, season_id: UUID | None = None
    ) -> list[dict[str, Any]]:
        target_season = season_id
        if target_season is None:
            curr = self.current_season()
            if curr is not None:
                target_season = curr["id"]
        if target_season is None:
            return []
        return self._all(
            """SELECT p.id, p.first_name, p.last_name, p.display_name,
                      p.nationality_code, p.photo_url, p.slug,
                      sm.position, sm.positions, sm.squad_number, sm.season_id,
                      t.id AS team_id, t.name AS team_name, t.short_name AS team_short_name,
                      t.tla AS team_tla, t.crest_url AS team_crest_url
               FROM squad_memberships sm
               JOIN players p ON p.id = sm.player_id
               JOIN teams t ON t.id = sm.team_id
               WHERE sm.team_id = %s AND sm.season_id = %s
               ORDER BY
                 CASE sm.position
                   WHEN 'GK' THEN 1
                   WHEN 'DEF' THEN 2
                   WHEN 'MID' THEN 3
                   WHEN 'FWD' THEN 4
                   ELSE 5
                 END,
                 sm.squad_number NULLS LAST,
                 p.display_name""",
            (team_id, target_season),
        )

    @staticmethod
    def _fixture_select() -> str:
        return """SELECT f.id,f.competition_id,f.season_id,f.home_team_id,h.name home_team_name,
          f.away_team_id,a.name away_team_name,f.status,f.kickoff_at,f.matchday,
          f.home_score,f.away_score,f.venue FROM fixtures f
          JOIN teams h ON h.id=f.home_team_id JOIN teams a ON a.id=f.away_team_id """
