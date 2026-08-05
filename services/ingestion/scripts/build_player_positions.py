from __future__ import annotations

import argparse
import ast
import csv
import json
import re
import unicodedata
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

EA_GROUP = {
    "GK": "GK",
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
FPL_GROUP = {1: "GK", 2: "DEF", 3: "MID", 4: "FWD"}
TEAM_ALIASES = {
    "Bournemouth": "AFC Bournemouth",
    "Leeds": "Leeds United",
    "Man City": "Manchester City",
    "Newcastle": "Newcastle Utd",
}


def normalized(value: str) -> str:
    ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]", "", ascii_value.casefold())


def name_tokens(value: str) -> set[str]:
    ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    return {token for token in re.findall(r"[a-z0-9]+", ascii_value.casefold()) if len(token) >= 4}


def parsed_alternatives(value: str) -> list[str]:
    if not value:
        return []
    parsed: Any = ast.literal_eval(value)
    return [item for item in parsed if isinstance(item, str)] if isinstance(parsed, list) else []


def match_score(player: dict[str, Any], candidate: dict[str, str], expected_team: str) -> float:
    candidate_name = candidate["_normalized_name"]
    full_name = normalized(f"{player['first_name']} {player['second_name']}")
    web_name = normalized(player["web_name"])
    score = max(
        SequenceMatcher(None, full_name, candidate_name).ratio(),
        SequenceMatcher(None, web_name, candidate_name).ratio() - 0.05,
    )
    player_tokens = name_tokens(
        f"{player['first_name']} {player['second_name']} {player['web_name']}"
    )
    candidate_tokens = candidate["_name_tokens"]
    if (
        candidate["Team"] == expected_team
        and len(player_tokens & candidate_tokens) >= 2
    ):
        score = max(score, 0.9)
    if full_name == candidate_name:
        score += 0.2
    elif web_name == candidate_name:
        score += 0.12
    elif candidate_name in full_name or full_name in candidate_name:
        score += 0.08
    if candidate["Team"] == expected_team:
        score += 0.08
    return score


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fpl-json", type=Path, required=True)
    parser.add_argument("--eafc-csv", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument(
        "--manual-overrides",
        type=Path,
        default=Path(__file__).parents[1] / "app" / "data" / "manual_player_positions.json",
    )
    args = parser.parse_args()

    fpl = json.loads(args.fpl_json.read_text(encoding="utf-8"))
    teams = {team["id"]: team["name"] for team in fpl["teams"]}
    with args.eafc_csv.open(encoding="utf-8-sig", newline="") as file:
        ea_players = list(csv.DictReader(file))
    for candidate in ea_players:
        candidate["_normalized_name"] = normalized(candidate["Name"])
        candidate["_name_tokens"] = name_tokens(candidate["Name"])
        candidate["_positions"] = [
            candidate["Position"], *parsed_alternatives(candidate["Alternative positions"])
        ]
        candidate["_position_groups"] = {
            EA_GROUP[position] for position in candidate["_positions"] if position in EA_GROUP
        }

    overrides: dict[str, dict[str, object]] = {}
    matched = 0
    for player in fpl["elements"]:
        broad_position = FPL_GROUP[player["element_type"]]
        player_tokens = name_tokens(
            f"{player['first_name']} {player['second_name']} {player['web_name']}"
        )
        expected_team = TEAM_ALIASES.get(teams[player["team"]], teams[player["team"]])
        compatible = [
            candidate
            for candidate in ea_players
            if (
                broad_position in candidate["_position_groups"]
            )
            and (
                candidate["Team"] == expected_team
                or bool(player_tokens & candidate["_name_tokens"])
            )
        ]
        if not compatible:
            continue
        ranked = sorted(
            (
                (match_score(player, candidate, expected_team), candidate)
                for candidate in compatible
            ),
            key=lambda item: (-item[0], int(item[1]["ID"])),
        )
        best_score, best = ranked[0]
        runner_up_score = ranked[1][0] if len(ranked) > 1 else 0
        if best_score < 0.82 or best_score - runner_up_score < 0.035:
            continue
        positions = list(dict.fromkeys(best["_positions"]))
        if not any(EA_GROUP.get(position) == broad_position for position in positions):
            continue
        rating = int(best["OVR"])
        if not 1 <= rating <= 99:
            continue
        overrides[str(player["id"])] = {"positions": positions, "ea_rating": rating}
        matched += 1

    if args.manual_overrides.exists():
        manual_payload = json.loads(args.manual_overrides.read_text(encoding="utf-8"))
        for player_id, positions in manual_payload.get("players", {}).items():
            if player_id not in overrides:
                raise ValueError(f"Manual position override has no EA FC match: {player_id}")
            if (
                not isinstance(positions, list)
                or not positions
                or any(position not in EA_GROUP for position in positions)
            ):
                raise ValueError(f"Invalid manual positions for FPL player {player_id}")
            overrides[player_id]["positions"] = list(dict.fromkeys(positions))

    payload = {
        "source": {
            "name": "EAFC26 Player Database",
            "license": "GPL-3.0",
            "url": "https://www.kaggle.com/datasets/flynn28/eafc26-player-database",
            "dataset_updated": "2026-04-02",
        },
        "players": overrides,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({"matched": matched, "total": len(fpl["elements"])}))


if __name__ == "__main__":
    main()
