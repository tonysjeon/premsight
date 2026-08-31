from __future__ import annotations

import re
import unicodedata
from difflib import SequenceMatcher
from typing import Any

TEAM_NAME_ALIASES: dict[str, str] = {
    "arsenal": "ARS",
    "aston villa": "AVL",
    "bournemouth": "BOU",
    "afc bournemouth": "BOU",
    "brentford": "BRE",
    "brighton": "BHA",
    "brighton and hove albion": "BHA",
    "chelsea": "CHE",
    "crystal palace": "CRY",
    "everton": "EVE",
    "fulham": "FUL",
    "ipswich": "IPS",
    "ipswich town": "IPS",
    "leicester": "LEI",
    "leicester city": "LEI",
    "liverpool": "LIV",
    "manchester city": "MCI",
    "man city": "MCI",
    "manchester united": "MUN",
    "man united": "MUN",
    "man utd": "MUN",
    "newcastle": "NEW",
    "newcastle united": "NEW",
    "nottingham forest": "NOT",
    "nott'm forest": "NOT",
    "southampton": "SOU",
    "tottenham": "TOT",
    "tottenham hotspur": "TOT",
    "spurs": "TOT",
    "west ham": "WHU",
    "west ham united": "WHU",
    "wolverhampton wanderers": "WOL",
    "wolves": "WOL",
    "sunderland": "SUN",
    "sunderland afc": "SUN",
}


def normalize_string(value: str) -> str:
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


def name_tokens(value: str) -> set[str]:
    cleaned = (
        value.replace("Ø", "o")
        .replace("ø", "o")
        .replace("Æ", "ae")
        .replace("æ", "ae")
        .replace("ß", "ss")
    )
    ascii_val = unicodedata.normalize("NFKD", cleaned).encode("ascii", "ignore").decode()
    return {token for token in re.findall(r"[a-z0-9]+", ascii_val.casefold()) if len(token) >= 3}


def team_tla_from_name(team_name: str) -> str | None:
    norm = re.sub(r"[^a-z0-9\s]", "", team_name.casefold()).strip()
    return TEAM_NAME_ALIASES.get(norm)


def match_player_candidate(
    query_name: str,
    query_team: str | None,
    candidates: list[dict[str, Any]],
    min_threshold: float = 0.72,
) -> dict[str, Any] | None:
    """Find the best matching player candidate from a list of player dicts.

    Candidate dict must have at least: 'id', 'display_name', 'first_name',
    'last_name', and optional 'team_tla'.
    """
    if not candidates:
        return None

    query_norm = normalize_string(query_name)
    query_toks = name_tokens(query_name)
    query_tla = team_tla_from_name(query_team) if query_team else None

    best_candidate: dict[str, Any] | None = None
    best_score = 0.0

    for cand in candidates:
        first = cand.get("first_name", "")
        last = cand.get("last_name", "")
        display = cand.get("display_name", "")
        full_name = f"{first} {last}".strip()

        full_norm = normalize_string(full_name)
        display_norm = normalize_string(display)
        last_norm = normalize_string(last)

        seq_score = max(
            SequenceMatcher(None, query_norm, full_norm).ratio(),
            SequenceMatcher(None, query_norm, display_norm).ratio(),
            SequenceMatcher(None, query_norm, f"{last_norm}{first}").ratio() if first else 0.0,
        )

        cand_toks = name_tokens(f"{first} {last} {display}")
        common_toks = len(query_toks & cand_toks)

        score = seq_score
        if common_toks >= 2:
            score = max(score, 0.85)
        elif common_toks == 1 and len(query_toks) == 1:
            score = max(score, 0.80)

        cand_tla = cand.get("team_tla")
        if query_tla and cand_tla and query_tla == cand_tla:
            score += 0.12

        initial_match = re.fullmatch(r"([A-Za-z])\.?\s+(.+)", query_name.strip())
        if initial_match and first:
            init = initial_match.group(1).lower()
            rest_norm = normalize_string(initial_match.group(2))
            if first[0].lower() == init and rest_norm and rest_norm in {
                last_norm,
                display_norm,
                full_norm,
            }:
                score = max(score, 0.94)
            elif first[0].lower() != init:
                score *= 0.45

        if score > best_score:
            best_score = score
            best_candidate = cand

    if best_score >= min_threshold:
        return best_candidate
    return None
