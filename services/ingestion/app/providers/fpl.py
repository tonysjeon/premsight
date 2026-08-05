from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, cast

import httpx

from app.domain.models import PlayerCatalog, PlayerPosition, ProviderPlayer, ProviderPlayerTeam

POSITION_BY_ID = {1: "GK", 2: "DEF", 3: "MID", 4: "FWD"}


class FplProvider:
    provider_name = "fpl"

    def __init__(self, base_url: str, timeout_seconds: float = 15.0) -> None:
        self._client = httpx.Client(base_url=base_url, timeout=timeout_seconds)

    def __enter__(self) -> FplProvider:
        return self

    def __exit__(self, *_: object) -> None:
        self._client.close()

    def player_catalog(self) -> PlayerCatalog:
        response = self._client.get("/api/bootstrap-static/")
        response.raise_for_status()
        payload: Any = response.json()
        if not isinstance(payload, dict):
            raise ValueError("FPL response must be an object")
        raw_teams = payload.get("teams")
        raw_players = payload.get("elements")
        if not isinstance(raw_teams, list) or not isinstance(raw_players, list):
            raise ValueError("FPL response is missing teams or elements")

        regions_response = self._client.get("/api/regions/")
        regions_response.raise_for_status()
        raw_regions: Any = regions_response.json()
        if not isinstance(raw_regions, list):
            raise ValueError("FPL regions response must be a list")
        region_codes = _region_codes(raw_regions)

        teams = tuple(self._team(item) for item in raw_teams)
        team_ids = {team.provider_id for team in teams}
        players = tuple(self._player(item, team_ids, region_codes) for item in raw_players)
        return PlayerCatalog(
            provider=self.provider_name,
            captured_at=datetime.now(UTC),
            teams=teams,
            players=players,
        )

    @staticmethod
    def _team(value: object) -> ProviderPlayerTeam:
        item = _object(value, "team")
        return ProviderPlayerTeam(
            provider_id=str(_integer(item, "id")),
            name=_string(item, "name"),
            tla=_string(item, "short_name").upper(),
        )

    @staticmethod
    def _player(
        value: object, team_ids: set[str], region_codes: dict[int, str]
    ) -> ProviderPlayer:
        item = _object(value, "player")
        position_id = _integer(item, "element_type")
        position = POSITION_BY_ID.get(position_id)
        if position is None:
            raise ValueError(f"Unsupported FPL position: {position_id}")
        team_provider_id = str(_integer(item, "team"))
        if team_provider_id not in team_ids:
            raise ValueError(f"Player references unknown FPL team: {team_provider_id}")
        region_value = item.get("region")
        if region_value is not None and (
            not isinstance(region_value, int) or isinstance(region_value, bool)
        ):
            raise ValueError("FPL field region must be an integer or null")
        nationality_code = None if region_value is None else region_codes.get(region_value)
        if region_value is not None and nationality_code is None:
            raise ValueError(f"Player references unknown FPL region: {region_value}")
        chance = item.get("chance_of_playing_next_round")
        availability = 100 if chance is None else _integer(item, "chance_of_playing_next_round")
        return ProviderPlayer(
            provider_id=str(_integer(item, "id")),
            team_provider_id=team_provider_id,
            first_name=_string(item, "first_name"),
            last_name=_string(item, "second_name"),
            display_name=_string(item, "web_name"),
            position=cast(PlayerPosition, position),
            positions=(cast(PlayerPosition, position),),
            nationality_code=nationality_code,
            photo_url=_photo_url(item),
            can_select=item.get("can_select") is not False,
            availability=availability,
            minutes=_integer(item, "minutes"),
            starts=_integer(item, "starts"),
            total_points=_integer(item, "total_points"),
            ownership=_decimal_string(item, "selected_by_percent"),
            price=_integer(item, "now_cost"),
        )


def _object(value: object, label: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ValueError(f"FPL {label} must be an object")
    return value


def _region_codes(values: list[object]) -> dict[int, str]:
    regions: dict[int, str] = {}
    for value in values:
        item = _object(value, "region")
        region_id = _integer(item, "id")
        code = _string(item, "iso_code_short").upper()
        if len(code) != 2 or not code.isalnum():
            raise ValueError("FPL region iso_code_short must be two alphanumeric characters")
        if region_id in regions:
            raise ValueError(f"Duplicate FPL region: {region_id}")
        regions[region_id] = code
    return regions


def _photo_url(item: dict[str, Any]) -> str | None:
    value = item.get("photo")
    if value is None:
        return None
    if not isinstance(value, str) or not value.strip():
        raise ValueError("FPL field photo must be a non-empty string or null")
    identifier = value.strip().rsplit(".", maxsplit=1)[0]
    if not identifier.isdigit():
        raise ValueError("FPL field photo must contain a numeric identifier")
    return (
        "https://resources.premierleague.com/premierleague/photos/players/"
        f"250x250/p{identifier}.png"
    )


def _integer(item: dict[str, Any], key: str) -> int:
    value = item.get(key)
    if not isinstance(value, int) or isinstance(value, bool):
        raise ValueError(f"FPL field {key} must be an integer")
    return value


def _string(item: dict[str, Any], key: str) -> str:
    value = item.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"FPL field {key} must be a non-empty string")
    return value.strip()


def _decimal_string(item: dict[str, Any], key: str) -> float:
    value = item.get(key)
    if not isinstance(value, str):
        raise ValueError(f"FPL field {key} must be a decimal string")
    try:
        return float(value)
    except ValueError as error:
        raise ValueError(f"FPL field {key} must be a decimal string") from error
