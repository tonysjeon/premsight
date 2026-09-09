from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.api.routes.auth import CurrentUser
from app.core.config import get_settings
from app.repositories.favorites import FavoritesRepository

router = APIRouter(prefix="/v1/favorites", tags=["favorites"])


def repository() -> FavoritesRepository:
    return FavoritesRepository(get_settings().database_url)


Repo = Annotated[FavoritesRepository, Depends(repository)]


@router.get("/players")
def players(user: CurrentUser, repo: Repo) -> dict:
    items = repo.players(user.id)
    return {"items": items, "count": len(items)}


@router.put("/players/{player_id}", status_code=204)
def save(player_id: UUID, user: CurrentUser, repo: Repo) -> None:
    if not repo.save(user.id, str(player_id)):
        raise HTTPException(404, "Player not found")


@router.delete("/players/{player_id}", status_code=204)
def remove(player_id: UUID, user: CurrentUser, repo: Repo) -> None:
    repo.remove(user.id, str(player_id))


@router.get("/teams")
def teams(user: CurrentUser, repo: Repo) -> dict:
    items = repo.teams(user.id)
    return {"items": items, "count": len(items)}


@router.put("/teams/{team_id}", status_code=204)
def follow(team_id: UUID, user: CurrentUser, repo: Repo) -> None:
    if not repo.follow(user.id, str(team_id)):
        raise HTTPException(404, "Team not found")


@router.delete("/teams/{team_id}", status_code=204)
def unfollow(team_id: UUID, user: CurrentUser, repo: Repo) -> None:
    repo.unfollow(user.id, str(team_id))
