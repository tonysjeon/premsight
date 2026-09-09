"""Reviewed roster exclusions; player identities and memberships remain intact."""

import json
from datetime import date
from functools import lru_cache
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, Field

from app.core.public_ids import season_slug


@lru_cache(maxsize=1)
def _roster_review() -> dict[str, Any]:
    path = Path(__file__).resolve().parents[1] / "data" / "roster_exclusions.json"
    return json.loads(path.read_text())


def filter_team_roster(
    players: list[dict[str, Any]], competition: str, season_name: str
) -> list[dict[str, Any]]:
    review = _roster_review()
    if competition != review["competition"] or season_slug(season_name) != review["season"]:
        return players
    excluded = {
        (team["team_tla"], slug)
        for team in review["teams"]
        for slug in team["excluded_player_slugs"]
    }
    return [p for p in players if (p.get("team_tla"), p.get("slug")) not in excluded]


@lru_cache(maxsize=1)
def _roster_facts() -> "RosterFacts":
    path = Path(__file__).resolve().parents[1] / "data" / "roster_facts.json"
    return RosterFacts.model_validate_json(path.read_text())


def enrich_team_roster(
    players: list[dict[str, Any]], competition: str, season_name: str, as_of: date
) -> list[dict[str, Any]]:
    facts = _roster_facts()
    if competition != facts.competition or season_slug(season_name) != facts.season:
        return players
    by_team = {team.team_tla: team.players for team in facts.teams}
    enriched = []
    for player in players:
        fact = by_team.get(player.get("team_tla"), {}).get(player.get("slug"))
        if fact is None:
            enriched.append(player)
            continue
        born = fact.date_of_birth
        age = as_of.year - born.year - ((as_of.month, as_of.day) < (born.month, born.day))
        enriched.append({
            **player,
            "display_name": fact.source_name,
            "positions": list(dict.fromkeys(
                {"LM": "LW", "RM": "RW"}.get(position, position)
                for position in fact.positions
            )),
            "squad_number": fact.squad_number,
            "date_of_birth": born.isoformat(),
            "age": age,
            "height_inches": fact.height_inches,
        })
    order = {
        (team.team_tla, slug): fact.roster_order
        for team in facts.teams
        for slug, fact in team.players.items()
    }
    return sorted(
        enriched,
        key=lambda player: order.get((player.get("team_tla"), player.get("slug")), float("inf")),
    )


class PlayerRosterFacts(BaseModel):
    source_name: str
    positions: list[Literal[
        "GK", "RB", "RWB", "CB", "LB", "LWB", "DM", "CM", "AM",
        "RM", "LM", "RW", "LW", "ST", "CF",
    ]] = Field(min_length=1)
    roster_order: int = Field(ge=0)
    squad_number: int | None = Field(ge=1, le=99)
    date_of_birth: date
    height_inches: int | None = Field(ge=48, le=96)


class TeamRosterFacts(BaseModel):
    team_tla: str
    source_url: str
    players: dict[str, PlayerRosterFacts]


class RosterFacts(BaseModel):
    competition: str
    season: str
    reviewed_on: date
    height_unit: Literal["inches"]
    teams: list[TeamRosterFacts]
