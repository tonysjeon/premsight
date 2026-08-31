from __future__ import annotations

import csv
import re
import unicodedata
from functools import lru_cache
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).resolve().parent / "data"

GK_COLUMNS: tuple[tuple[str, str], ...] = (
    ("Save%", "save_pct"),
    ("Aerials won", "aerials"),
    ("Int (PAdj)", "int_padj"),
    ("Passes cmp", "passes_cmp"),
    ("Long%", "long_pct"),
    ("Short%", "short_pct"),
    ("PSxG-GA", "psxg_ga"),
)
CB_COLUMNS: tuple[tuple[str, str], ...] = (
    ("Passes cmp", "passes_cmp"),
    ("Fwd pass%", "fwd_pass_pct"),
    ("Prog passes", "prog_passes"),
    ("Poss won", "poss_won"),
    ("Def duel%", "def_duel_pct"),
    ("Aerial duel%", "aerial_duel_pct"),
    ("Prog carries", "prog_carries"),
)
FB_COLUMNS: tuple[tuple[str, str], ...] = (
    ("Crosses cmp", "crosses_cmp"),
    ("xA", "xa"),
    ("Prog passes", "prog_passes"),
    ("Poss won", "poss_won"),
    ("Def duel%", "def_duel_pct"),
    ("Aerial duel%", "aerial_duel_pct"),
    ("Prog carries", "prog_carries"),
)
MID_COLUMNS: tuple[tuple[str, str], ...] = (
    ("Duel%", "duel_pct"),
    ("Poss won", "poss_won"),
    ("Prog carries", "prog_carries"),
    ("Fwd passes", "fwd_passes"),
    ("Fwd pass%", "fwd_pass_pct"),
    ("Key passes", "key_passes"),
    ("Prog passes", "prog_passes"),
)
ST_COLUMNS: tuple[tuple[str, str], ...] = (
    ("NPG", "npg"),
    ("npxG", "npxg"),
    ("Goal conv%", "conv_pct"),
    ("Aerial%", "aerial_pct"),
    ("Touches in box", "touches_box"),
    ("xA", "xa"),
    ("Off duels won", "off_duels"),
)
WG_COLUMNS: tuple[tuple[str, str], ...] = (
    ("Prog carries", "prog_carries"),
    ("Dribbles cmp", "dribbles_cmp"),
    ("NPG", "npg"),
    ("npxG + xA", "npxg_xa"),
    ("Assists", "assists"),
    ("Key passes", "key_passes"),
    ("Crosses cmp", "crosses_cmp"),
)

SCOUT_SLOTS: dict[str, tuple[str, tuple[tuple[str, str], ...], str | None]] = {
    "GK": ("premier_league_gk_percentiles.csv", GK_COLUMNS, None),
    "CB": ("premier_league_cb_percentiles.csv", CB_COLUMNS, None),
    "FB": ("premier_league_fb_percentiles.csv", FB_COLUMNS, "Position"),
    "MID": ("premier_league_midfielder_percentiles.csv", MID_COLUMNS, "Position"),
    "ST": ("premier_league_st_percentiles.csv", ST_COLUMNS, None),
    "WG": ("premier_league_winger_percentiles.csv", WG_COLUMNS, "Position"),
}

SCOUT_FAMILIES: dict[str, str] = {
    "GK": "GK",
    "CB": "DEF",
    "FB": "DEF",
    "MID": "MID",
    "ST": "FWD",
    "WG": "FWD",
}


def scout_slot(position: str | None) -> str | None:
    if not position:
        return None
    key = position.strip().upper()
    if key == "GK":
        return "GK"
    if key == "CB":
        return "CB"
    if key in {"FB", "LB", "RB"}:
        return "FB"
    if key == "MID":
        return "MID"
    if key in {"ST", "CF"}:
        return "ST"
    if key in {"WG", "LW", "RW"}:
        return "WG"
    return None


def fold_name(value: str) -> str:
    cleaned = (
        value.replace("Ø", "o")
        .replace("ø", "o")
        .replace("Æ", "ae")
        .replace("æ", "ae")
        .replace("ß", "ss")
        .replace("Ł", "l")
        .replace("ł", "l")
        .replace("Đ", "d")
        .replace("đ", "d")
    )
    ascii_val = unicodedata.normalize("NFKD", cleaned).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]", "", ascii_val.casefold())


KNOWN_NAME_ALIASES: dict[str, set[str]] = {
    "savinho": {"savio", "sávio", "savio moreira de oliveira"},
}

KNOWN_SCOUT_TEAM_ALIASES: dict[str, str] = {
    "B. Johnson": "Everton",
}


def _candidate_keys(candidate: dict[str, Any]) -> set[str]:
    first = str(candidate.get("first_name") or "")
    last = str(candidate.get("last_name") or "")
    display = str(candidate.get("display_name") or "")
    keys = {
        fold_name(first),
        fold_name(last),
        fold_name(display),
        fold_name(f"{first} {last}"),
        fold_name(f"{last} {first}"),
    }
    for part in last.split():
        folded = fold_name(part)
        if folded:
            keys.add(folded)
    for part in first.split():
        folded = fold_name(part)
        if folded:
            keys.add(folded)
    return {item for item in keys if item}


def match_scout_name(query: str, candidates: list[dict[str, Any]]) -> dict[str, Any] | None:
    query = query.strip()
    if not query or not candidates:
        return None
    folded_query = fold_name(query)

    exact: list[dict[str, Any]] = []
    aliases = KNOWN_NAME_ALIASES.get(folded_query, set())
    for candidate in candidates:
        keys = _candidate_keys(candidate)
        if folded_query in keys or any(fold_name(a) in keys for a in aliases):
            exact.append(candidate)
    unique_exact = _unique_by_id(exact)
    if len(unique_exact) == 1:
        return unique_exact[0]
    if len(unique_exact) > 1:
        display_hits = [
            candidate
            for candidate in unique_exact
            if fold_name(str(candidate.get("display_name") or "")) == folded_query
        ]
        if len(display_hits) == 1:
            return display_hits[0]

    initial = re.fullmatch(r"([A-Za-z])\.?\s+(.+)", query)
    if initial:
        init = fold_name(initial.group(1))
        rest = fold_name(initial.group(2))
        hits: list[dict[str, Any]] = []
        for candidate in candidates:
            first = str(candidate.get("first_name") or "")
            last = str(candidate.get("last_name") or "")
            folded_first = fold_name(first)
            folded_last = fold_name(last)
            keys = _candidate_keys(candidate)
            if rest in keys:
                if folded_first and folded_first[0] == init:
                    hits.append(candidate)
                elif folded_last and folded_last[0] == init:
                    hits.append(candidate)
            elif (folded_last and folded_last[0] == init and folded_first == rest) or (
                folded_first and folded_first[0] == init and folded_last == rest
            ):
                hits.append(candidate)
        unique_hits = _unique_by_id(hits)
        if len(unique_hits) == 1:
            return unique_hits[0]
        if len(unique_hits) > 1:
            display_last = [
                candidate
                for candidate in unique_hits
                if fold_name((str(candidate.get("display_name") or "").split() or [""])[-1])
                == rest
            ]
            if len(display_last) == 1:
                return display_last[0]
            first_init_match = [
                candidate
                for candidate in unique_hits
                if fold_name(str(candidate.get("first_name") or ""))[:1] == init
            ]
            if len(first_init_match) == 1:
                return first_init_match[0]
            team_hint = KNOWN_SCOUT_TEAM_ALIASES.get(query)
            if team_hint:
                team_match = [
                    candidate
                    for candidate in unique_hits
                    if fold_name(team_hint) in fold_name(str(candidate.get("team_name") or ""))
                    or fold_name(team_hint)
                    in fold_name(str(candidate.get("team_short_name") or ""))
                ]
                if len(team_match) == 1:
                    return team_match[0]

    tokens = query.split()
    if len(tokens) >= 2:
        first_q = fold_name(tokens[0])
        rest_q = fold_name(" ".join(tokens[1:]))
        hits = []
        for candidate in candidates:
            if fold_name(str(candidate.get("first_name") or "")) != first_q:
                continue
            if rest_q in _candidate_keys(candidate):
                hits.append(candidate)
        unique_hits = _unique_by_id(hits)
        if len(unique_hits) == 1:
            return unique_hits[0]
    return None


def _unique_by_id(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: dict[str, dict[str, Any]] = {}
    for row in rows:
        seen[str(row.get("id"))] = row
    return list(seen.values())


def load_scout_rows(slot: str) -> tuple[dict[str, Any], ...]:
    spec = SCOUT_SLOTS.get(slot)
    if spec is None:
        return ()
    filename, columns, side_column = spec
    path = DATA_DIR / filename
    if not path.is_file():
        return ()
    return _cached_scout_rows(slot, path.stat().st_mtime_ns, filename, columns, side_column)


@lru_cache(maxsize=8)
def _cached_scout_rows(
    _slot: str,
    _mtime: int,
    filename: str,
    columns: tuple[tuple[str, str], ...],
    side_column: str | None,
) -> tuple[dict[str, Any], ...]:
    rows: list[dict[str, Any]] = []
    with (DATA_DIR / filename).open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for item in reader:
            name = (item.get("Name") or "").strip()
            if not name:
                continue
            stats = {key: float(item[column]) for column, key in columns}
            side = None
            if side_column:
                side = (item.get(side_column) or "").strip().upper() or None
            rows.append({"name": name, "stats": stats, "scout_position": side})
    return tuple(rows)


def attach_scout_stats(player: dict[str, Any], row: dict[str, Any]) -> dict[str, Any]:
    attached = dict(player)
    stats = dict(row["stats"])
    attached["season_stats"] = {
        "minutes": 0,
        "stats": stats,
        "features": [stats[key] for key in stats],
        "provider": "scout-csv",
        "model_version": "scout-v1",
    }
    if row.get("scout_position"):
        attached["scout_position"] = row["scout_position"]
    if row.get("name"):
        attached["scout_name"] = row["name"]
    return attached


def _matches_query(player: dict[str, Any], csv_name: str, query: str) -> bool:
    needle = fold_name(query)
    if not needle:
        return True
    haystack = fold_name(
        " ".join(
            [
                str(player.get("first_name") or ""),
                str(player.get("last_name") or ""),
                str(player.get("display_name") or ""),
                csv_name,
            ]
        )
    )
    return needle in haystack


def match_scout_rows(
    slot: str,
    family_candidates: list[dict[str, Any]],
    extra_candidates: list[dict[str, Any]] | None = None,
    q: str | None = None,
) -> list[dict[str, Any]]:
    used: set[str] = set()
    matched: list[dict[str, Any]] = []
    fallback = extra_candidates or []
    for row in load_scout_rows(slot):
        hit = match_scout_name(row["name"], family_candidates)
        if hit is None:
            hit = match_scout_name(row["name"], fallback)
        if hit is None:
            continue
        player_id = str(hit.get("id"))
        if player_id in used:
            continue
        if q and not _matches_query(hit, row["name"], q):
            continue
        used.add(player_id)
        matched.append(attach_scout_stats(hit, row))
    return matched


def scout_stats_for_player(player: dict[str, Any]) -> dict[str, Any] | None:
    for slot in SCOUT_SLOTS:
        for row in load_scout_rows(slot):
            if match_scout_name(row["name"], [player]) is not None:
                return attach_scout_stats(player, row)
    return None
