from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

FixtureStatus = Literal["scheduled", "live", "postponed", "cancelled", "completed"]
PlayerPosition = Literal["GK", "DEF", "MID", "FWD"]


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
    crest_url: str | None = None


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


class ProviderPlayer(NormalizedModel):
    provider_id: str
    team_provider_id: str
    first_name: str
    last_name: str
    display_name: str
    position: PlayerPosition
    nationality_code: str | None
    photo_url: str | None
    can_select: bool
    availability: int
    minutes: int
    starts: int
    total_points: int
    ownership: float
    price: int


class ProviderPlayerTeam(NormalizedModel):
    provider_id: str
    name: str
    tla: str


class PlayerCatalog(NormalizedModel):
    provider: str
    captured_at: datetime
    teams: tuple[ProviderPlayerTeam, ...]
    players: tuple[ProviderPlayer, ...]


class SelectedPlayer(NormalizedModel):
    player: ProviderPlayer
    club_rank: int
    global_rank: int


class PlayerSnapshot(NormalizedModel):
    provider: str
    captured_at: datetime
    teams: tuple[ProviderPlayerTeam, ...]
    players_by_team: dict[str, tuple[SelectedPlayer, ...]]


class PlayerSnapshotResult(NormalizedModel):
    snapshot_id: str
    season_id: str
    teams_processed: int
    players_processed: int
