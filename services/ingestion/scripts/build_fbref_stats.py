from __future__ import annotations

import json
from pathlib import Path

from app.core.config import get_settings
from app.providers.fbref import FAMILY_STATS_FILES, normalize_position_family
from app.providers.fpl import FplProvider
from app.services.position_enrichment import enrich_player_positions, load_position_overrides

DATA_DIR = Path(__file__).parents[1] / "app" / "data"
OUTPUT_FILE = DATA_DIR / "fbref_pl_stats.json"


def player_is_cb(player) -> bool:
    if player.position != "DEF":
        return False
    detailed = list(player.positions) if player.positions else [player.position]
    primary = next((item for item in detailed if item != "DEF"), detailed[0] if detailed else "DEF")
    return primary in {"CB", "DEF"}


def player_is_fb(player) -> bool:
    if player.position != "DEF":
        return False
    detailed = list(player.positions) if player.positions else [player.position]
    primary = next((item for item in detailed if item != "DEF"), detailed[0] if detailed else "DEF")
    return primary in {"LB", "LWB", "RB", "RWB"}


def generate_stats_for_player(player, team_name: str) -> dict:
    rating = player.ea_rating or 75
    pos = player.position
    detailed = list(player.positions) if player.positions else [pos]
    rating_factor = (rating - 50) / 45.0  # ~0.5 to 1.0

    if pos == "GK":
        save_pct = round(64.0 + rating_factor * 12.0, 1)
        saves_per90 = round(2.8 + (1.0 - rating_factor) * 1.5, 2)
        ga_per90 = round(max(0.7, 1.8 - rating_factor * 0.8), 2)
        cs_pct = round(18.0 + rating_factor * 24.0, 1)
        pass_comp = round(65.0 + rating_factor * 18.0, 1)
        launched = round(6.0 + rating_factor * 4.0, 2)

        stats = {
            "save_pct": save_pct,
            "saves_per90": saves_per90,
            "goals_against_per90": ga_per90,
            "clean_sheet_pct": cs_pct,
            "pass_completion_pct": pass_comp,
            "launched_passes_per90": launched,
        }
        features = [
            save_pct,
            saves_per90,
            ga_per90,
            cs_pct,
            pass_comp,
            launched,
        ]
    else:
        # Outfield position weighting
        is_striker = "ST" in detailed or "CF" in detailed or pos == "FWD"
        is_winger = "LW" in detailed or "RW" in detailed or "LM" in detailed or "RM" in detailed
        is_cam = "CAM" in detailed
        is_cm = "CM" in detailed
        is_cdm = "CDM" in detailed
        is_fb = "LB" in detailed or "RB" in detailed or "LWB" in detailed or "RWB" in detailed

        if is_striker:
            goals = round(max(0.1, 0.28 + rating_factor * 0.45), 2)
            shots = round(max(1.0, 2.1 + rating_factor * 1.8), 2)
            assists = round(max(0.04, 0.10 + rating_factor * 0.16), 2)
            kp = round(max(0.5, 0.9 + rating_factor * 1.1), 2)
            prog_pass = round(max(1.0, 1.8 + rating_factor * 1.5), 2)
            prog_carry = round(max(1.2, 2.0 + rating_factor * 2.2), 2)
            take_ons = round(max(0.6, 1.1 + rating_factor * 1.5), 2)
            tackles = round(max(0.3, 0.6 + rating_factor * 0.4), 2)
            interceptions = round(max(0.1, 0.3 + rating_factor * 0.3), 2)
            blocks = round(max(0.5, 0.8 + rating_factor * 0.4), 2)
            aerials = round(max(0.8, 1.5 + rating_factor * 2.5), 2)
            pass_comp = round(68.0 + rating_factor * 12.0, 1)
        elif is_winger:
            goals = round(max(0.08, 0.18 + rating_factor * 0.30), 2)
            shots = round(max(1.2, 1.8 + rating_factor * 1.6), 2)
            assists = round(max(0.08, 0.16 + rating_factor * 0.28), 2)
            kp = round(max(0.8, 1.4 + rating_factor * 1.6), 2)
            prog_pass = round(max(2.0, 3.2 + rating_factor * 2.5), 2)
            prog_carry = round(max(2.5, 4.2 + rating_factor * 3.8), 2)
            take_ons = round(max(1.4, 2.5 + rating_factor * 3.0), 2)
            tackles = round(max(0.8, 1.4 + rating_factor * 0.8), 2)
            interceptions = round(max(0.4, 0.7 + rating_factor * 0.6), 2)
            blocks = round(max(0.6, 1.0 + rating_factor * 0.6), 2)
            aerials = round(max(0.3, 0.7 + rating_factor * 0.8), 2)
            pass_comp = round(74.0 + rating_factor * 12.0, 1)
        elif is_cam:
            goals = round(max(0.06, 0.14 + rating_factor * 0.22), 2)
            shots = round(max(1.0, 1.5 + rating_factor * 1.4), 2)
            assists = round(max(0.12, 0.22 + rating_factor * 0.34), 2)
            kp = round(max(1.4, 2.2 + rating_factor * 2.2), 2)
            prog_pass = round(max(3.5, 5.5 + rating_factor * 3.5), 2)
            prog_carry = round(max(2.0, 3.2 + rating_factor * 2.8), 2)
            take_ons = round(max(1.0, 1.8 + rating_factor * 1.8), 2)
            tackles = round(max(1.0, 1.6 + rating_factor * 0.9), 2)
            interceptions = round(max(0.5, 0.8 + rating_factor * 0.7), 2)
            blocks = round(max(0.7, 1.1 + rating_factor * 0.6), 2)
            aerials = round(max(0.4, 0.8 + rating_factor * 0.8), 2)
            pass_comp = round(78.0 + rating_factor * 12.0, 1)
        elif is_cm:
            goals = round(max(0.03, 0.08 + rating_factor * 0.14), 2)
            shots = round(max(0.6, 1.0 + rating_factor * 1.0), 2)
            assists = round(max(0.06, 0.12 + rating_factor * 0.20), 2)
            kp = round(max(0.9, 1.5 + rating_factor * 1.4), 2)
            prog_pass = round(max(4.0, 6.2 + rating_factor * 3.8), 2)
            prog_carry = round(max(1.5, 2.5 + rating_factor * 2.0), 2)
            take_ons = round(max(0.6, 1.1 + rating_factor * 1.2), 2)
            tackles = round(max(1.6, 2.4 + rating_factor * 1.2), 2)
            interceptions = round(max(0.9, 1.4 + rating_factor * 0.9), 2)
            blocks = round(max(1.0, 1.5 + rating_factor * 0.8), 2)
            aerials = round(max(0.6, 1.2 + rating_factor * 1.2), 2)
            pass_comp = round(83.0 + rating_factor * 9.0, 1)
        elif is_cdm:
            goals = round(max(0.01, 0.04 + rating_factor * 0.08), 2)
            shots = round(max(0.3, 0.6 + rating_factor * 0.6), 2)
            assists = round(max(0.03, 0.06 + rating_factor * 0.10), 2)
            kp = round(max(0.5, 0.8 + rating_factor * 0.9), 2)
            prog_pass = round(max(3.8, 5.2 + rating_factor * 3.2), 2)
            prog_carry = round(max(1.0, 1.8 + rating_factor * 1.5), 2)
            take_ons = round(max(0.4, 0.8 + rating_factor * 0.9), 2)
            tackles = round(max(2.2, 3.2 + rating_factor * 1.6), 2)
            interceptions = round(max(1.4, 2.2 + rating_factor * 1.4), 2)
            blocks = round(max(1.4, 2.1 + rating_factor * 1.0), 2)
            aerials = round(max(1.2, 2.0 + rating_factor * 1.8), 2)
            pass_comp = round(85.0 + rating_factor * 8.0, 1)
        elif is_fb:
            goals = round(max(0.01, 0.04 + rating_factor * 0.09), 2)
            shots = round(max(0.3, 0.6 + rating_factor * 0.7), 2)
            assists = round(max(0.06, 0.12 + rating_factor * 0.22), 2)
            kp = round(max(0.8, 1.3 + rating_factor * 1.3), 2)
            prog_pass = round(max(3.0, 4.8 + rating_factor * 3.0), 2)
            prog_carry = round(max(2.0, 3.4 + rating_factor * 2.8), 2)
            take_ons = round(max(0.8, 1.5 + rating_factor * 1.8), 2)
            tackles = round(max(1.8, 2.6 + rating_factor * 1.3), 2)
            interceptions = round(max(1.1, 1.7 + rating_factor * 1.0), 2)
            blocks = round(max(1.2, 1.8 + rating_factor * 0.8), 2)
            aerials = round(max(0.8, 1.5 + rating_factor * 1.4), 2)
            pass_comp = round(79.0 + rating_factor * 10.0, 1)
        else:  # CB
            goals = round(max(0.01, 0.03 + rating_factor * 0.07), 2)
            shots = round(max(0.2, 0.4 + rating_factor * 0.5), 2)
            assists = round(max(0.01, 0.02 + rating_factor * 0.06), 2)
            kp = round(max(0.2, 0.4 + rating_factor * 0.5), 2)
            prog_pass = round(max(2.5, 4.2 + rating_factor * 2.6), 2)
            prog_carry = round(max(0.6, 1.2 + rating_factor * 1.4), 2)
            take_ons = round(max(0.2, 0.4 + rating_factor * 0.5), 2)
            tackles = round(max(1.6, 2.3 + rating_factor * 1.2), 2)
            interceptions = round(max(1.4, 2.1 + rating_factor * 1.3), 2)
            blocks = round(max(1.8, 2.7 + rating_factor * 1.3), 2)
            aerials = round(max(2.0, 3.4 + rating_factor * 2.6), 2)
            pass_comp = round(86.0 + rating_factor * 8.0, 1)

        stats = {
            "goals_per90": goals,
            "shots_per90": shots,
            "assists_per90": assists,
            "key_passes_per90": kp,
            "pass_completion_pct": pass_comp,
            "progressive_passes_per90": prog_pass,
            "progressive_carries_per90": prog_carry,
            "take_ons_per90": take_ons,
            "tackles_per90": tackles,
            "interceptions_per90": interceptions,
            "blocks_per90": blocks,
            "aerials_won_per90": aerials,
        }
        features = [
            goals,
            shots,
            assists,
            kp,
            pass_comp,
            prog_pass,
            prog_carry,
            take_ons,
            tackles,
            interceptions,
            blocks,
            aerials,
        ]

    return {
        "name": f"{player.first_name} {player.last_name}",
        "team": team_name,
        "position": pos,
        "minutes": max(450, player.minutes or 900),
        "stats": stats,
        "features": features,
    }


def main() -> None:
    settings = get_settings()
    with FplProvider(settings.fpl_base_url) as provider:
        catalog = enrich_player_positions(provider.player_catalog(), load_position_overrides())
        teams_by_id = {t.provider_id: t.name for t in catalog.teams}
        scout_cb = DATA_DIR / "premier_league_cb_percentiles.csv"
        scout_fb = DATA_DIR / "premier_league_fb_percentiles.csv"
        results = []
        for player in catalog.players:
            if scout_cb.is_file() and player_is_cb(player):
                continue
            if scout_fb.is_file() and player_is_fb(player):
                continue
            t_name = teams_by_id.get(player.team_provider_id, "")
            results.append(generate_stats_for_player(player, t_name))

        OUTPUT_FILE.write_text(json.dumps(results, indent=2), encoding="utf-8")
        grouped: dict[str, list] = {family: [] for family in FAMILY_STATS_FILES}
        for item in results:
            family = normalize_position_family(str(item.get("position", "MID")))
            grouped[family].append(item)
        scout_gk = DATA_DIR / "premier_league_gk_percentiles.csv"
        for family, path in FAMILY_STATS_FILES.items():
            if family == "GK" and scout_gk.is_file():
                print(f"Kept scout GK file {path}")
                continue
            path.write_text(json.dumps(grouped[family], indent=2), encoding="utf-8")
            print(f"Wrote {len(grouped[family])} {family} players to {path}")
        print(f"Generated stats for {len(results)} players to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
