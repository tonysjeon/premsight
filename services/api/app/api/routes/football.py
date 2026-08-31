from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from app.clients.prediction import PredictionClient, PredictionServiceError
from app.core.config import get_settings
from app.repositories.football import FootballRepository

router = APIRouter(prefix="/v1", tags=["football"])


def repository() -> FootballRepository:
    return FootballRepository(get_settings().database_url)


Repo = Annotated[FootballRepository, Depends(repository)]


def prediction_client() -> PredictionClient:
    return PredictionClient(get_settings().prediction_engine_url)


Prediction = Annotated[PredictionClient, Depends(prediction_client)]
Status = Literal["scheduled", "live", "postponed", "cancelled", "completed"]


def _season_id(repo: FootballRepository, key: str) -> UUID:
    season_id = repo.resolve_season_id(key)
    if season_id is None:
        raise HTTPException(404, "Season not found")
    return season_id


def _team_id(repo: FootballRepository, key: str) -> UUID:
    team_id = repo.resolve_team_id(key)
    if team_id is None:
        raise HTTPException(404, "Team not found")
    return team_id


@router.get("/seasons/current")
def current_season(repo: Repo) -> dict:
    item = repo.current_season()
    if item is None:
        raise HTTPException(404, "Current season not found")
    return item


@router.get("/seasons")
def seasons(repo: Repo) -> dict:
    items = repo.seasons()
    return {"items": items, "count": len(items)}


@router.get("/teams")
def teams(repo: Repo, season_id: str | None = None) -> dict:
    items = repo.teams(None if season_id is None else _season_id(repo, season_id))
    return {"items": items, "count": len(items)}


@router.get("/teams/{team_id}")
def team(team_id: str, repo: Repo) -> dict:
    item = repo.team(team_id)
    if item is None:
        raise HTTPException(404, "Team not found")
    item["fixtures"] = repo.fixtures(team_id=_team_id(repo, team_id))
    return item


@router.get("/teams/{team_id}/roster")
def team_roster(team_id: str, repo: Repo, season_id: str | None = None) -> dict:
    resolved_team_id = _team_id(repo, team_id)
    resolved_season_id = None if season_id is None else _season_id(repo, season_id)
    items = repo.team_roster(resolved_team_id, resolved_season_id)
    return {"items": items, "count": len(items)}


@router.get("/players")
def players(
    repo: Repo,
    season_id: str | None = None,
    team_id: str | None = None,
    q: str | None = None,
    position: str | None = None,
    has_stats: bool = False,
) -> dict:
    resolved_season = None if season_id is None else _season_id(repo, season_id)
    resolved_team = None if team_id is None else _team_id(repo, team_id)
    items = repo.players(resolved_season, resolved_team, q, position, has_stats)
    return {"items": items, "count": len(items)}


@router.get("/players/{player_id}")
def player(player_id: str, repo: Repo, season_id: str | None = None) -> dict:
    resolved_season = None if season_id is None else _season_id(repo, season_id)
    item = repo.player(player_id, resolved_season)
    if item is None:
        raise HTTPException(404, "Player not found")
    return item


@router.get("/fixtures")
def fixtures(
    repo: Repo,
    season_id: str | None = None,
    status: Annotated[Status | None, Query()] = None,
    team_id: str | None = None,
) -> dict:
    items = repo.fixtures(
        None if season_id is None else _season_id(repo, season_id),
        status,
        None if team_id is None else _team_id(repo, team_id),
    )
    return {"items": items, "count": len(items)}


@router.get("/fixtures/{fixture_id}")
def fixture(fixture_id: UUID, repo: Repo) -> dict:
    item = repo.fixture(fixture_id)
    if item is None:
        raise HTTPException(404, "Fixture not found")
    return item


@router.get("/fixtures/{fixture_id}/prediction")
def fixture_prediction(fixture_id: UUID, repo: Repo, client: Prediction) -> dict:
    fixture_item = repo.fixture(fixture_id)
    if fixture_item is None:
        raise HTTPException(404, "Fixture not found")
    results = repo.prediction_history(fixture_item["competition_id"], fixture_item["kickoff_at"])
    try:
        return client.predict(
            str(fixture_item["home_team_id"]),
            str(fixture_item["away_team_id"]),
            results,
        )
    except PredictionServiceError as error:
        raise HTTPException(error.status_code, error.detail) from error


@router.get("/standings")
def standings(season_id: str, repo: Repo) -> dict:
    items = repo.standings(_season_id(repo, season_id))
    return {"items": items, "count": len(items)}


@router.get("/player-snapshots/latest")
def latest_player_snapshot(repo: Repo) -> dict:
    item = repo.latest_player_snapshot()
    if item is None:
        raise HTTPException(404, "Player snapshot not found")
    return item
