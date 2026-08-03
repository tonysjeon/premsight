from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.config import get_settings
from app.repositories.football import FootballRepository

router = APIRouter(prefix="/v1", tags=["football"])


def repository() -> FootballRepository:
    return FootballRepository(get_settings().database_url)


Repo = Annotated[FootballRepository, Depends(repository)]
Status = Literal["scheduled", "live", "postponed", "cancelled", "completed"]


@router.get("/seasons/current")
def current_season(repo: Repo) -> dict:
    item = repo.current_season()
    if item is None:
        raise HTTPException(404, "Current season not found")
    return item


@router.get("/teams")
def teams(repo: Repo, season_id: UUID | None = None) -> dict:
    items = repo.teams(season_id)
    return {"items": items, "count": len(items)}


@router.get("/teams/{team_id}")
def team(team_id: UUID, repo: Repo) -> dict:
    item = repo.team(team_id)
    if item is None:
        raise HTTPException(404, "Team not found")
    item["fixtures"] = repo.fixtures(team_id=team_id)
    return item


@router.get("/fixtures")
def fixtures(
    repo: Repo,
    season_id: UUID | None = None,
    status: Annotated[Status | None, Query()] = None,
    team_id: UUID | None = None,
) -> dict:
    items = repo.fixtures(season_id, status, team_id)
    return {"items": items, "count": len(items)}


@router.get("/fixtures/{fixture_id}")
def fixture(fixture_id: UUID, repo: Repo) -> dict:
    item = repo.fixture(fixture_id)
    if item is None:
        raise HTTPException(404, "Fixture not found")
    return item


@router.get("/standings")
def standings(season_id: UUID, repo: Repo) -> dict:
    items = repo.standings(season_id)
    return {"items": items, "count": len(items)}
