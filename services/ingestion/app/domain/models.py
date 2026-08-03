from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

FixtureStatus = Literal["scheduled", "live", "postponed", "cancelled", "completed"]


class NormalizedModel(BaseModel):
    model_config = ConfigDict(frozen=True)


class ProviderCompetition(NormalizedModel):
    provider_id: str
    code: str
    name: str
    country_code: str | None = None


class ProviderSeason(NormalizedModel):
    provider_id: str
    name: str
    start_date: date
    end_date: date


class ProviderTeam(NormalizedModel):
    provider_id: str
    name: str
    short_name: str | None = None
    tla: str | None = None
    venue: str | None = None


class ProviderFixture(NormalizedModel):
    provider_id: str
    home_team_provider_id: str
    away_team_provider_id: str
    status: FixtureStatus
    kickoff_at: datetime
    matchday: int | None = None
    home_score: int | None = None
    away_score: int | None = None
    venue: str | None = None


class HistoricalSnapshot(NormalizedModel):
    provider: str
    competition: ProviderCompetition
    season: ProviderSeason
    teams: tuple[ProviderTeam, ...]
    fixtures: tuple[ProviderFixture, ...]


class SyncResult(NormalizedModel):
    competition_id: str
    season_id: str
    teams_processed: int
    fixtures_processed: int
