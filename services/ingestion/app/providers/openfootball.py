from __future__ import annotations

import re
from datetime import date, datetime, timezone
import httpx

from app.domain.models import (
    HistoricalSnapshot,
    ProviderCompetition,
    ProviderFixture,
    ProviderSeason,
    ProviderTeam,
)

PROVIDER_NAME = "openfootball"

MONTH_MAP = {
    "Jan": 1,
    "Feb": 2,
    "Mar": 3,
    "Apr": 4,
    "May": 5,
    "Jun": 6,
    "Jul": 7,
    "Aug": 8,
    "Sep": 9,
    "Oct": 10,
    "Nov": 11,
    "Dec": 12,
}

TEAM_REGISTRY: dict[str, dict[str, str]] = {
    "Arsenal FC": {"short_name": "Arsenal", "tla": "ARS"},
    "Aston Villa FC": {"short_name": "Aston Villa", "tla": "AVL"},
    "AFC Bournemouth": {"short_name": "Bournemouth", "tla": "BOU"},
    "Brentford FC": {"short_name": "Brentford", "tla": "BRE"},
    "Brighton & Hove Albion FC": {"short_name": "Brighton", "tla": "BHA"},
    "Burnley FC": {"short_name": "Burnley", "tla": "BUR"},
    "Chelsea FC": {"short_name": "Chelsea", "tla": "CHE"},
    "Crystal Palace FC": {"short_name": "Crystal Palace", "tla": "CRY"},
    "Everton FC": {"short_name": "Everton", "tla": "EVE"},
    "Fulham FC": {"short_name": "Fulham", "tla": "FUL"},
    "Ipswich Town FC": {"short_name": "Ipswich", "tla": "IPS"},
    "Leeds United FC": {"short_name": "Leeds", "tla": "LEE"},
    "Leicester City FC": {"short_name": "Leicester", "tla": "LEI"},
    "Liverpool FC": {"short_name": "Liverpool", "tla": "LIV"},
    "Luton Town FC": {"short_name": "Luton", "tla": "LUT"},
    "Manchester City FC": {"short_name": "Man City", "tla": "MCI"},
    "Manchester United FC": {"short_name": "Man United", "tla": "MUN"},
    "Newcastle United FC": {"short_name": "Newcastle", "tla": "NEW"},
    "Norwich City FC": {"short_name": "Norwich", "tla": "NOR"},
    "Nottingham Forest FC": {"short_name": "Nottm Forest", "tla": "NOT"},
    "Sheffield United FC": {"short_name": "Sheffield Utd", "tla": "SHU"},
    "Southampton FC": {"short_name": "Southampton", "tla": "SOU"},
    "Tottenham Hotspur FC": {"short_name": "Tottenham", "tla": "TOT"},
    "Watford FC": {"short_name": "Watford", "tla": "WAT"},
    "West Ham United FC": {"short_name": "West Ham", "tla": "WHU"},
    "Wolverhampton Wanderers FC": {"short_name": "Wolves", "tla": "WOL"},
}


def normalize_team_name(raw_name: str) -> str:
    cleaned = raw_name.strip()
    if not cleaned.endswith("FC") and not cleaned.startswith("AFC"):
        cleaned = f"{cleaned} FC"
    return cleaned


def parse_match_line(line: str) -> tuple[str | None, str, int, int, str] | None:
    # 1. Optional time at start
    time_match = re.match(r"^(\d{1,2}:\d{2})\s+", line)
    time_str = None
    body = line
    if time_match:
        time_str = time_match.group(1)
        body = line[time_match.end():].strip()

    # Pattern A: "Team A v Team B 2-1 (1-0)" or "Team A v Team B 2-1"
    match_a = re.match(r"^(.+?)\s+v\s+(.+?)\s+(\d+)-(\d+)(?:\s+\([0-9-]+\))?$", body)
    if match_a:
        home_raw = match_a.group(1).strip()
        away_raw = match_a.group(2).strip()
        home_score = int(match_a.group(3))
        away_score = int(match_a.group(4))
        return time_str, home_raw, home_score, away_score, away_raw

    # Pattern B: "Team A 2-1 (1-0) Team B" or "Team A 2-1 Team B"
    match_b = re.match(r"^(.+?)\s+(\d+)-(\d+)(?:\s+\([0-9-]+\))?\s+(.+)$", body)
    if match_b:
        home_raw = match_b.group(1).strip()
        home_score = int(match_b.group(2))
        away_score = int(match_b.group(3))
        away_raw = match_b.group(4).strip()
        return time_str, home_raw, home_score, away_score, away_raw

    return None


def parse_openfootball_text(
    content: str, season_start_year: int
) -> tuple[ProviderSeason, list[ProviderTeam], list[ProviderFixture]]:
    lines = content.splitlines()
    season_name = f"{season_start_year}/{season_start_year + 1}"
    start_date = date(season_start_year, 8, 1)
    end_date = date(season_start_year + 1, 5, 31)

    provider_season = ProviderSeason(
        provider_id=f"pl-{season_start_year}",
        name=season_name,
        start_date=start_date,
        end_date=end_date,
    )

    teams_by_name: dict[str, ProviderTeam] = {}
    fixtures: list[ProviderFixture] = []

    current_matchday = 1
    current_date: date | None = None
    last_time_str = "15:00"

    date_re = re.compile(r"^[A-Za-z]{3}\s+([A-Za-z]{3})\s+(\d{1,2})(?:\s+\d{4})?$")

    for line in lines:
        line = line.strip()
        if not line or line.startswith("=") or line.startswith("#"):
            continue

        if line.startswith("▪ Matchday") or line.startswith("Matchday"):
            m = re.search(r"Matchday\s+(\d+)", line)
            if m:
                current_matchday = int(m.group(1))
            continue

        date_match = date_re.match(line)
        if date_match:
            month_str = date_match.group(1)
            day = int(date_match.group(2))
            month = MONTH_MAP.get(month_str, 8)
            year = season_start_year if month >= 7 else season_start_year + 1
            current_date = date(year, month, day)
            last_time_str = "15:00"
            continue

        parsed_match = parse_match_line(line)
        if not parsed_match:
            continue

        time_str, home_raw, home_score, away_score, away_raw = parsed_match
        if time_str is not None:
            last_time_str = time_str
        else:
            time_str = last_time_str

        home_name = normalize_team_name(home_raw)
        away_name = normalize_team_name(away_raw)

        for name in (home_name, away_name):
            if name not in teams_by_name:
                registry_entry = TEAM_REGISTRY.get(name, {})
                tla = registry_entry.get("tla") or name[:3].upper()
                short_name = registry_entry.get("short_name") or name.replace(" FC", "").replace("AFC ", "")
                provider_team_id = f"openfb-team-{tla.lower()}"
                teams_by_name[name] = ProviderTeam(
                    provider_id=provider_team_id,
                    name=name,
                    short_name=short_name,
                    tla=tla,
                )

        home_team = teams_by_name[home_name]
        away_team = teams_by_name[away_name]

        if current_date is not None:
            hours, minutes = map(int, time_str.split(":"))
            kickoff_at = datetime(
                current_date.year,
                current_date.month,
                current_date.day,
                hours,
                minutes,
                tzinfo=timezone.utc,
            )
        else:
            kickoff_at = datetime(season_start_year, 8, 1, 15, 0, tzinfo=timezone.utc)

        fixture_id = f"openfb-pl-{season_start_year}-m{current_matchday}-{home_team.tla}-{away_team.tla}"

        fixtures.append(
            ProviderFixture(
                provider_id=fixture_id,
                kickoff_at=kickoff_at,
                matchday=current_matchday,
                home_team_provider_id=home_team.provider_id,
                away_team_provider_id=away_team.provider_id,
                status="completed",
                home_score=home_score,
                away_score=away_score,
            )
        )

    return provider_season, list(teams_by_name.values()), fixtures


class OpenFootballProvider:
    def __init__(self, base_url: str = "https://raw.githubusercontent.com/openfootball/england/master") -> None:
        self._base_url = base_url.rstrip("/")

    def fetch_season_snapshot(self, season_start_year: int) -> HistoricalSnapshot:
        season_folder = f"{season_start_year}-{str(season_start_year + 1)[-2:]}"
        url = f"{self._base_url}/{season_folder}/1-premierleague.txt"
        response = httpx.get(url, timeout=15)
        response.raise_for_status()

        competition = ProviderCompetition(
            provider_id="openfb-pl",
            code="PL",
            name="Premier League",
            country_code="ENG",
        )

        season, teams, fixtures = parse_openfootball_text(response.text, season_start_year)

        return HistoricalSnapshot(
            provider=PROVIDER_NAME,
            competition=competition,
            season=season,
            teams=tuple(teams),
            fixtures=tuple(fixtures),
        )
