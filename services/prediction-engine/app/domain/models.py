from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, model_validator


class DomainModel(BaseModel):
    model_config = ConfigDict(frozen=True)


class MatchResult(DomainModel):
    home_team_id: str = Field(min_length=1)
    away_team_id: str = Field(min_length=1)
    home_score: int = Field(ge=0)
    away_score: int = Field(ge=0)

    @model_validator(mode="after")
    def teams_are_distinct(self) -> MatchResult:
        if self.home_team_id == self.away_team_id:
            raise ValueError("home and away teams must be distinct")
        return self


class TeamRating(DomainModel):
    team_id: str
    home_matches: int
    away_matches: int
    home_attack: float
    home_defense: float
    away_attack: float
    away_defense: float


class RatingSet(DomainModel):
    league_home_average: float
    league_away_average: float
    teams: dict[str, TeamRating]


class ExpectedGoals(DomainModel):
    home: float
    away: float
