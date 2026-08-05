from __future__ import annotations

import json
from pathlib import Path
from typing import cast

from app.domain.models import DetailedPlayerPosition, PlayerCatalog, PlayerPosition

POSITION_GROUPS: dict[DetailedPlayerPosition, PlayerPosition] = {
    "GK": "GK",
    "DEF": "DEF",
    "MID": "MID",
    "FWD": "FWD",
    "LB": "DEF",
    "LWB": "DEF",
    "CB": "DEF",
    "RB": "DEF",
    "RWB": "DEF",
    "CDM": "MID",
    "CM": "MID",
    "CAM": "MID",
    "LM": "MID",
    "RM": "MID",
    "LW": "FWD",
    "RW": "FWD",
    "CF": "FWD",
    "ST": "FWD",
}

DEFAULT_POSITION_FILE = Path(__file__).parents[1] / "data" / "player_positions.json"


def load_position_overrides(
    path: Path = DEFAULT_POSITION_FILE,
) -> dict[str, tuple[DetailedPlayerPosition, ...]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict) or not isinstance(payload.get("players"), dict):
        raise ValueError("Player position overrides must contain a players object")
    result: dict[str, tuple[DetailedPlayerPosition, ...]] = {}
    for player_id, raw_positions in payload["players"].items():
        if (
            not isinstance(player_id, str)
            or not isinstance(raw_positions, list)
            or not raw_positions
        ):
            raise ValueError("Player position override entries must be non-empty lists")
        if any(
            not isinstance(position, str) or position not in POSITION_GROUPS
            for position in raw_positions
        ):
            raise ValueError(f"Unsupported detailed positions for FPL player {player_id}")
        positions = tuple(
            cast(DetailedPlayerPosition, position) for position in dict.fromkeys(raw_positions)
        )
        result[player_id] = positions
    return result


def enrich_player_positions(
    catalog: PlayerCatalog,
    overrides: dict[str, tuple[DetailedPlayerPosition, ...]],
) -> PlayerCatalog:
    players = []
    for player in catalog.players:
        positions = overrides.get(player.provider_id, player.positions)
        if not any(POSITION_GROUPS[position] == player.position for position in positions):
            raise ValueError(
                f"Detailed position group mismatch for FPL player {player.provider_id}: "
                f"{player.position} vs {positions}"
            )
        players.append(player.model_copy(update={"positions": positions}))
    return catalog.model_copy(update={"players": tuple(players)})
