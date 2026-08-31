from __future__ import annotations

import csv
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from app.domain.models import NormalizedModel

DATA_DIR = Path(__file__).parents[1] / "data"
DEFAULT_FBREF_STATS_FILE = DATA_DIR / "fbref_pl_stats.json"
SCOUT_CB_FILE = DATA_DIR / "premier_league_cb_percentiles.csv"
SCOUT_FB_FILE = DATA_DIR / "premier_league_fb_percentiles.csv"
SCOUT_MID_FILE = DATA_DIR / "premier_league_midfielder_percentiles.csv"
SCOUT_ST_FILE = DATA_DIR / "premier_league_st_percentiles.csv"
SCOUT_WG_FILE = DATA_DIR / "premier_league_winger_percentiles.csv"
POSITION_FAMILIES = ("GK", "DEF", "MID", "FWD")
FAMILY_STATS_FILES: dict[str, Path] = {
    family: DATA_DIR / f"fbref_pl_{family.lower()}.json" for family in POSITION_FAMILIES
}

CB_STAT_COLUMNS: tuple[tuple[str, str], ...] = (
    ("Passes cmp", "passes_cmp"),
    ("Fwd pass%", "fwd_pass_pct"),
    ("Prog passes", "prog_passes"),
    ("Poss won", "poss_won"),
    ("Def duel%", "def_duel_pct"),
    ("Aerial duel%", "aerial_duel_pct"),
    ("Prog carries", "prog_carries"),
)

FB_STAT_COLUMNS: tuple[tuple[str, str], ...] = (
    ("Crosses cmp", "crosses_cmp"),
    ("xA", "xa"),
    ("Prog passes", "prog_passes"),
    ("Poss won", "poss_won"),
    ("Def duel%", "def_duel_pct"),
    ("Aerial duel%", "aerial_duel_pct"),
    ("Prog carries", "prog_carries"),
)

MID_STAT_COLUMNS: tuple[tuple[str, str], ...] = (
    ("Duel%", "duel_pct"),
    ("Poss won", "poss_won"),
    ("Prog carries", "prog_carries"),
    ("Fwd passes", "fwd_passes"),
    ("Fwd pass%", "fwd_pass_pct"),
    ("Key passes", "key_passes"),
    ("Prog passes", "prog_passes"),
)

ST_STAT_COLUMNS: tuple[tuple[str, str], ...] = (
    ("NPG", "npg"),
    ("npxG", "npxg"),
    ("Goal conv%", "conv_pct"),
    ("Aerial%", "aerial_pct"),
    ("Touches in box", "touches_box"),
    ("xA", "xa"),
    ("Off duels won", "off_duels"),
)

WG_STAT_COLUMNS: tuple[tuple[str, str], ...] = (
    ("Prog carries", "prog_carries"),
    ("Dribbles cmp", "dribbles_cmp"),
    ("NPG", "npg"),
    ("npxG + xA", "npxg_xa"),
    ("Assists", "assists"),
    ("Key passes", "key_passes"),
    ("Crosses cmp", "crosses_cmp"),
)


class RawPlayerStat(NormalizedModel):
    name: str
    team: str
    position: str
    minutes: int
    stats: dict[str, float]
    features: list[float]
    scout_position: str | None = None


@dataclass(frozen=True)
class FbrefSeasonStats:
    provider: str
    model_version: str
    season_name: str
    players: tuple[RawPlayerStat, ...]


def normalize_position_family(value: str | None) -> str:
    key = (value or "MID").strip().upper()
    if key in {"ATT", "FWD"}:
        return "FWD"
    if key in POSITION_FAMILIES:
        return key
    return "MID"


def cb_stats_are_percentiles(stats: dict[str, Any] | None) -> bool:
    if not isinstance(stats, dict):
        return False
    return all(key in stats for _, key in CB_STAT_COLUMNS)


def fb_stats_are_percentiles(stats: dict[str, Any] | None) -> bool:
    if not isinstance(stats, dict):
        return False
    return all(key in stats for _, key in FB_STAT_COLUMNS)


def mid_stats_are_percentiles(stats: dict[str, Any] | None) -> bool:
    if not isinstance(stats, dict):
        return False
    return all(key in stats for _, key in MID_STAT_COLUMNS)


def st_stats_are_percentiles(stats: dict[str, Any] | None) -> bool:
    if not isinstance(stats, dict):
        return False
    return all(key in stats for _, key in ST_STAT_COLUMNS)


def wg_stats_are_percentiles(stats: dict[str, Any] | None) -> bool:
    if not isinstance(stats, dict):
        return False
    return all(key in stats for _, key in WG_STAT_COLUMNS)


def load_scout_cb_rows(path: Path = SCOUT_CB_FILE) -> list[dict[str, Any]]:
    if not path.is_file():
        return []
    rows: list[dict[str, Any]] = []
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for item in reader:
            name = (item.get("Name") or "").strip()
            if not name:
                continue
            stats = {key: float(item[column]) for column, key in CB_STAT_COLUMNS}
            rows.append(
                {
                    "name": name,
                    "team": "",
                    "position": "DEF",
                    "minutes": 900,
                    "stats": stats,
                    "features": [stats[key] for _, key in CB_STAT_COLUMNS],
                }
            )
    return rows


def load_scout_fb_rows(path: Path = SCOUT_FB_FILE) -> list[dict[str, Any]]:
    if not path.is_file():
        return []
    rows: list[dict[str, Any]] = []
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for item in reader:
            name = (item.get("Name") or "").strip()
            if not name:
                continue
            side = (item.get("Position") or "").strip().upper()
            if side not in {"LB", "RB"}:
                side = "RB" if side.startswith("R") else "LB"
            stats = {key: float(item[column]) for column, key in FB_STAT_COLUMNS}
            rows.append(
                {
                    "name": name,
                    "team": "",
                    "position": "DEF",
                    "scout_position": side,
                    "minutes": 900,
                    "stats": stats,
                    "features": [stats[key] for _, key in FB_STAT_COLUMNS],
                }
            )
    return rows


def load_scout_mid_rows(path: Path = SCOUT_MID_FILE) -> list[dict[str, Any]]:
    if not path.is_file():
        return []
    rows: list[dict[str, Any]] = []
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for item in reader:
            name = (item.get("Name") or "").strip()
            if not name:
                continue
            role = (item.get("Position") or "").strip().upper()
            if role not in {"CDM", "CM", "CAM"}:
                role = "CM"
            stats = {key: float(item[column]) for column, key in MID_STAT_COLUMNS}
            rows.append(
                {
                    "name": name,
                    "team": "",
                    "position": "MID",
                    "scout_position": role,
                    "minutes": 900,
                    "stats": stats,
                    "features": [stats[key] for _, key in MID_STAT_COLUMNS],
                }
            )
    return rows


def load_scout_st_rows(path: Path = SCOUT_ST_FILE) -> list[dict[str, Any]]:
    if not path.is_file():
        return []
    rows: list[dict[str, Any]] = []
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for item in reader:
            name = (item.get("Name") or "").strip()
            if not name:
                continue
            stats = {key: float(item[column]) for column, key in ST_STAT_COLUMNS}
            rows.append(
                {
                    "name": name,
                    "team": "",
                    "position": "FWD",
                    "scout_position": "ST",
                    "minutes": 900,
                    "stats": stats,
                    "features": [stats[key] for _, key in ST_STAT_COLUMNS],
                }
            )
    return rows


def load_scout_wg_rows(path: Path = SCOUT_WG_FILE) -> list[dict[str, Any]]:
    if not path.is_file():
        return []
    rows: list[dict[str, Any]] = []
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for item in reader:
            name = (item.get("Name") or "").strip()
            if not name:
                continue
            role = (item.get("Position") or "").strip().upper()
            if role not in {"LW", "RW"}:
                role = "WG"
            stats = {key: float(item[column]) for column, key in WG_STAT_COLUMNS}
            rows.append(
                {
                    "name": name,
                    "team": "",
                    "position": "FWD",
                    "scout_position": role,
                    "minutes": 900,
                    "stats": stats,
                    "features": [stats[key] for _, key in WG_STAT_COLUMNS],
                }
            )
    return rows


def load_family_stats_file(path: Path, family: str) -> list[dict[str, Any]]:
    if not path.is_file():
        return []
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        return []
    rows: list[dict[str, Any]] = []
    for item in payload:
        if not isinstance(item, dict):
            continue
        row = dict(item)
        row["position"] = family
        rows.append(row)
    return rows


def load_cached_fbref_stats(
    path: Path = DEFAULT_FBREF_STATS_FILE,
    position: str | None = None,
) -> list[dict[str, Any]]:
    family = None if position is None else normalize_position_family(position)
    families = POSITION_FAMILIES if family is None else (family,)
    grouped: list[dict[str, Any]] = []
    for item_family in families:
        if item_family == "MID":
            scout_mids = load_scout_mid_rows()
            if scout_mids:
                grouped.extend(scout_mids)
                continue
        if item_family == "FWD":
            scout_sts = load_scout_st_rows()
            scout_wgs = load_scout_wg_rows()
            if scout_sts or scout_wgs:
                grouped.extend(scout_sts)
                grouped.extend(scout_wgs)
                continue
        grouped.extend(load_family_stats_file(FAMILY_STATS_FILES[item_family], item_family))
        if item_family == "DEF":
            grouped.extend(load_scout_cb_rows())
            grouped.extend(load_scout_fb_rows())
    if grouped:
        return grouped
    if not path.is_file():
        return []
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        return []
    rows = []
    for item in payload:
        if not isinstance(item, dict):
            continue
        item_family = normalize_position_family(str(item.get("position", "MID")))
        if family is not None and item_family != family:
            continue
        row = dict(item)
        row["position"] = item_family
        rows.append(row)
    return rows


class FbrefProvider:
    provider_name = "fbref"
    model_version = "player-sim-v1"

    def __init__(self, cache_file: Path = DEFAULT_FBREF_STATS_FILE) -> None:
        self._cache_file = cache_file

    def fetch_season_stats(
        self,
        season_start_year: int,
        position: str | None = None,
    ) -> FbrefSeasonStats:
        cached = load_cached_fbref_stats(self._cache_file, position=position)
        raw_players: list[RawPlayerStat] = []
        for item in cached:
            stats = {
                k: float(v)
                for k, v in item.get("stats", {}).items()
                if isinstance(v, (int, float))
            }
            scout_position = item.get("scout_position")
            raw_players.append(
                RawPlayerStat(
                    name=item["name"],
                    team=item.get("team", ""),
                    position=normalize_position_family(str(item.get("position", "MID"))),
                    minutes=int(item.get("minutes", 0)),
                    stats=stats,
                    features=[float(f) for f in item.get("features", [])],
                    scout_position=str(scout_position).upper() if scout_position else None,
                )
            )
        return FbrefSeasonStats(
            provider=self.provider_name,
            model_version=self.model_version,
            season_name=f"{season_start_year}/{season_start_year + 1}",
            players=tuple(raw_players),
        )
