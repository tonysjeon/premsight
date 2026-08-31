from __future__ import annotations

import time
from collections.abc import Callable
from datetime import date, datetime
from typing import Any

import httpx
from pydantic import BaseModel, ConfigDict, Field

from app.domain.models import (
    HistoricalSnapshot,
    ProviderCompetition,
    ProviderFixture,
    ProviderMatchEvent,
    ProviderSeason,
    ProviderTeam,
)

PROVIDER_NAME = "football-data"
TRANSIENT_STATUS_CODES = {429, 500, 502, 503, 504}
STATUS_MAP = {
    "TIMED": "scheduled",
    "SCHEDULED": "scheduled",
    "IN_PLAY": "live",
    "LIVE": "live",
    "PAUSED": "live",
    "POSTPONED": "postponed",
    "SUSPENDED": "postponed",
    "CANCELLED": "cancelled",
    "FINISHED": "completed",
    "AWARDED": "completed",
}
GOAL_TYPE_MAP = {"REGULAR": "regular", "OWN": "own", "PENALTY": "penalty"}
CARD_TYPE_MAP = {"YELLOW": "yellow", "YELLOW_RED": "yellow_red", "RED": "red"}
UNFOLD_HEADERS = {
    "X-Unfold-Goals": "true",
    "X-Unfold-Bookings": "true",
    "X-Unfold-Subs": "true",
}


class ProviderPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")


class AreaPayload(ProviderPayload):
    code: str | None = None


class CompetitionPayload(ProviderPayload):
    id: int
    code: str
    name: str
    area: AreaPayload | None = None


class SeasonPayload(ProviderPayload):
    id: int
    start_date: date = Field(alias="startDate")
    end_date: date = Field(alias="endDate")


class TeamPayload(ProviderPayload):
    id: int
    name: str
    short_name: str | None = Field(default=None, alias="shortName")
    tla: str | None = None
    venue: str | None = None
    crest: str | None = None


class TeamsResponse(ProviderPayload):
    competition: CompetitionPayload
    season: SeasonPayload
    teams: list[TeamPayload]


class ScoreSide(ProviderPayload):
    home: int | None = None
    away: int | None = None


class ScorePayload(ProviderPayload):
    full_time: ScoreSide = Field(alias="fullTime")


class NamedEntity(ProviderPayload):
    id: int | None = None
    name: str | None = None


class GoalPayload(ProviderPayload):
    minute: int | None = None
    injury_time: int | None = Field(default=None, alias="injuryTime")
    type: str | None = None
    team: NamedEntity | None = None
    scorer: NamedEntity | None = None
    assist: NamedEntity | None = None
    score: ScoreSide | None = None


class BookingPayload(ProviderPayload):
    minute: int | None = None
    team: NamedEntity | None = None
    player: NamedEntity | None = None
    card: str | None = None


class SubstitutionPayload(ProviderPayload):
    minute: int | None = None
    team: NamedEntity | None = None
    player_out: NamedEntity | None = Field(default=None, alias="playerOut")
    player_in: NamedEntity | None = Field(default=None, alias="playerIn")


class MatchPayload(ProviderPayload):
    id: int
    utc_date: datetime = Field(alias="utcDate")
    status: str
    matchday: int | None = None
    home_team: TeamPayload = Field(alias="homeTeam")
    away_team: TeamPayload = Field(alias="awayTeam")
    score: ScorePayload
    goals: list[GoalPayload] = Field(default_factory=list)
    bookings: list[BookingPayload] = Field(default_factory=list)
    substitutions: list[SubstitutionPayload] = Field(default_factory=list)


class MatchesResponse(ProviderPayload):
    matches: list[MatchPayload]


class FootballDataProvider:
    def __init__(
        self,
        *,
        api_token: str,
        base_url: str = "https://api.football-data.org/v4",
        client: httpx.Client | None = None,
        max_attempts: int = 3,
        sleep: Callable[[float], None] = time.sleep,
    ) -> None:
        if not api_token:
            raise ValueError("FOOTBALL_DATA_API_TOKEN is required")
        self._client = client or httpx.Client(
            base_url=base_url.rstrip("/"),
            headers={"X-Auth-Token": api_token},
            timeout=httpx.Timeout(20.0, connect=5.0),
        )
        self._owns_client = client is None
        self._max_attempts = max_attempts
        self._sleep = sleep

    def close(self) -> None:
        if self._owns_client:
            self._client.close()

    def __enter__(self) -> FootballDataProvider:
        return self

    def __exit__(self, *_: object) -> None:
        self.close()

    def fetch_season(self, competition_code: str, season_start_year: int) -> HistoricalSnapshot:
        params = {"season": str(season_start_year)}
        teams_payload = TeamsResponse.model_validate(
            self._get(f"/competitions/{competition_code}/teams", params=params)
        )
        matches_payload = MatchesResponse.model_validate(
            self._get(
                f"/competitions/{competition_code}/matches",
                params=params,
                headers=UNFOLD_HEADERS,
            )
        )

        competition = teams_payload.competition
        season = teams_payload.season
        teams = tuple(self._normalize_team(team) for team in teams_payload.teams)
        team_by_id = {team.provider_id: team for team in teams}

        fixtures = tuple(
            self._normalize_match(match, team_by_id) for match in matches_payload.matches
        )
        return HistoricalSnapshot(
            provider=PROVIDER_NAME,
            competition=ProviderCompetition(
                provider_id=str(competition.id),
                code=competition.code,
                name=competition.name,
                country_code=competition.area.code if competition.area else None,
            ),
            season=ProviderSeason(
                provider_id=str(season.id),
                name=f"{season.start_date.year}/{season.end_date.year}",
                start_date=season.start_date,
                end_date=season.end_date,
            ),
            teams=teams,
            fixtures=fixtures,
        )

    def _get(
        self,
        path: str,
        *,
        params: dict[str, str],
        headers: dict[str, str] | None = None,
    ) -> Any:
        for attempt in range(1, self._max_attempts + 1):
            try:
                response = self._client.get(path, params=params, headers=headers)
            except httpx.TransportError:
                if attempt == self._max_attempts:
                    raise
                self._sleep(float(2 ** (attempt - 1)))
                continue

            if response.status_code not in TRANSIENT_STATUS_CODES:
                response.raise_for_status()
                return response.json()
            if attempt == self._max_attempts:
                response.raise_for_status()
            retry_after = response.headers.get("Retry-After")
            self._sleep(float(retry_after) if retry_after else float(2 ** (attempt - 1)))
        raise RuntimeError("provider request attempts exhausted")

    @staticmethod
    def _normalize_team(team: TeamPayload) -> ProviderTeam:
        tla = team.tla if team.tla and len(team.tla) == 3 else None
        return ProviderTeam(
            provider_id=str(team.id),
            name=team.name,
            short_name=team.short_name,
            tla=tla,
            venue=team.venue,
            crest_url=team.crest,
        )

    @staticmethod
    def _normalize_match(
        match: MatchPayload,
        team_by_id: dict[str, ProviderTeam],
    ) -> ProviderFixture:
        try:
            normalized_status = STATUS_MAP[match.status]
        except KeyError as error:
            raise ValueError(f"unsupported football-data status: {match.status}") from error

        home_provider_id = str(match.home_team.id)
        away_provider_id = str(match.away_team.id)
        if home_provider_id not in team_by_id or away_provider_id not in team_by_id:
            raise ValueError(f"match {match.id} references a team outside the season team list")

        score = match.score.full_time
        if normalized_status == "completed" and (score.home is None or score.away is None):
            raise ValueError(f"completed match {match.id} has no final score")

        return ProviderFixture(
            provider_id=str(match.id),
            home_team_provider_id=home_provider_id,
            away_team_provider_id=away_provider_id,
            status=normalized_status,
            kickoff_at=match.utc_date,
            matchday=match.matchday,
            home_score=score.home,
            away_score=score.away,
            venue=team_by_id[home_provider_id].venue,
            events=FootballDataProvider._normalize_events(match),
        )

    def fetch_matches(
        self,
        competition_code: str,
        season_start_year: int,
        date_from: date,
        date_to: date,
    ) -> tuple[ProviderFixture, ...]:
        matches_payload = MatchesResponse.model_validate(
            self._get(
                f"/competitions/{competition_code}/matches",
                params={
                    "season": str(season_start_year),
                    "dateFrom": date_from.isoformat(),
                    "dateTo": date_to.isoformat(),
                },
                headers=UNFOLD_HEADERS,
            )
        )
        return tuple(self._normalize_match_result(match) for match in matches_payload.matches)

    @staticmethod
    def _normalize_match_result(match: MatchPayload) -> ProviderFixture:
        try:
            normalized_status = STATUS_MAP[match.status]
        except KeyError as error:
            raise ValueError(f"unsupported football-data status: {match.status}") from error
        score = match.score.full_time
        if normalized_status == "completed" and (score.home is None or score.away is None):
            raise ValueError(f"completed match {match.id} has no final score")
        return ProviderFixture(
            provider_id=str(match.id),
            home_team_provider_id=str(match.home_team.id),
            away_team_provider_id=str(match.away_team.id),
            status=normalized_status,
            kickoff_at=match.utc_date,
            matchday=match.matchday,
            home_score=score.home,
            away_score=score.away,
            venue=None,
            events=FootballDataProvider._normalize_events(match),
        )

    @staticmethod
    def _normalize_events(match: MatchPayload) -> tuple[ProviderMatchEvent, ...]:
        events: list[ProviderMatchEvent] = []
        for goal in match.goals:
            goal_type = GOAL_TYPE_MAP.get((goal.type or "REGULAR").upper())
            if goal_type is None:
                raise ValueError(f"unsupported football-data goal type: {goal.type}")
            events.append(
                ProviderMatchEvent(
                    event_type="goal",
                    minute=goal.minute,
                    extra_minute=goal.injury_time,
                    period=FootballDataProvider._period(goal.minute),
                    team_provider_id=FootballDataProvider._entity_id(goal.team),
                    player_name=FootballDataProvider._entity_name(goal.scorer),
                    related_player_name=FootballDataProvider._entity_name(goal.assist),
                    goal_type=goal_type,
                    home_score=goal.score.home if goal.score else None,
                    away_score=goal.score.away if goal.score else None,
                )
            )
        for booking in match.bookings:
            if not booking.card:
                raise ValueError(f"booking in match {match.id} is missing a card type")
            card_type = CARD_TYPE_MAP.get(booking.card.upper())
            if card_type is None:
                raise ValueError(f"unsupported football-data card type: {booking.card}")
            events.append(
                ProviderMatchEvent(
                    event_type="card",
                    minute=booking.minute,
                    period=FootballDataProvider._period(booking.minute),
                    team_provider_id=FootballDataProvider._entity_id(booking.team),
                    player_name=FootballDataProvider._entity_name(booking.player),
                    card_type=card_type,
                )
            )
        for substitution in match.substitutions:
            events.append(
                ProviderMatchEvent(
                    event_type="substitution",
                    minute=substitution.minute,
                    period=FootballDataProvider._period(substitution.minute),
                    team_provider_id=FootballDataProvider._entity_id(substitution.team),
                    player_name=FootballDataProvider._entity_name(substitution.player_in),
                    related_player_name=FootballDataProvider._entity_name(substitution.player_out),
                )
            )
        events.sort(
            key=lambda event: (
                event.minute if event.minute is not None else 10_000,
                event.extra_minute or 0,
                {"goal": 0, "card": 1, "substitution": 2}[event.event_type],
                event.player_name or "",
            )
        )
        return tuple(events)

    @staticmethod
    def _period(minute: int | None) -> str | None:
        if minute is None:
            return None
        return "1H" if minute <= 45 else "2H"

    @staticmethod
    def _entity_id(entity: NamedEntity | None) -> str | None:
        if entity is None or entity.id is None:
            return None
        return str(entity.id)

    @staticmethod
    def _entity_name(entity: NamedEntity | None) -> str | None:
        if entity is None or not entity.name:
            return None
        return entity.name
