from datetime import datetime
from typing import Any
from uuid import UUID

import psycopg
from psycopg.rows import dict_row


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
        return self._one(
            """SELECT s.id, s.competition_id, c.name competition_name, s.name,
                      s.start_date, s.end_date, s.is_current
               FROM seasons s JOIN competitions c ON c.id=s.competition_id
               WHERE s.is_current ORDER BY s.start_date DESC LIMIT 1"""
        )

    def seasons(self) -> list[dict[str, Any]]:
        return self._all(
            """SELECT s.id, s.competition_id, c.name competition_name, s.name,
                      s.start_date, s.end_date, s.is_current
               FROM seasons s JOIN competitions c ON c.id=s.competition_id
               ORDER BY s.start_date DESC"""
        )

    def teams(self, season_id: UUID | None = None) -> list[dict[str, Any]]:
        if season_id is None:
            return self._all("SELECT id,name,short_name,tla,crest_url FROM teams ORDER BY name")
        return self._all(
            """SELECT DISTINCT t.id,t.name,t.short_name,t.tla,t.crest_url FROM teams t
               JOIN fixtures f ON t.id IN (f.home_team_id,f.away_team_id)
               WHERE f.season_id=%s ORDER BY t.name""",
            (season_id,),
        )

    def team(self, team_id: UUID) -> dict[str, Any] | None:
        return self._one(
            "SELECT id,name,short_name,tla,crest_url FROM teams WHERE id=%s", (team_id,)
        )

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

    @staticmethod
    def _fixture_select() -> str:
        return """SELECT f.id,f.competition_id,f.season_id,f.home_team_id,h.name home_team_name,
          f.away_team_id,a.name away_team_name,f.status,f.kickoff_at,f.matchday,
          f.home_score,f.away_score,f.venue FROM fixtures f
          JOIN teams h ON h.id=f.home_team_id JOIN teams a ON a.id=f.away_team_id """
