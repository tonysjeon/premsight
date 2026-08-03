from __future__ import annotations

import math
from collections import defaultdict
from dataclasses import dataclass

from app.domain.models import ExpectedGoals, MatchResult, RatingSet, TeamRating


class InsufficientHistoryError(ValueError):
    """Raised when supplied results cannot support a target prediction."""


@dataclass
class _TeamTotals:
    home_matches: int = 0
    away_matches: int = 0
    home_for: int = 0
    home_against: int = 0
    away_for: int = 0
    away_against: int = 0


def calculate_ratings(results: list[MatchResult]) -> RatingSet:
    if not results:
        raise InsufficientHistoryError("at least one completed result is required")
    league_home_average = sum(result.home_score for result in results) / len(results)
    league_away_average = sum(result.away_score for result in results) / len(results)
    if league_home_average <= 0 or league_away_average <= 0:
        raise InsufficientHistoryError("league home and away scoring averages must be positive")

    totals: defaultdict[str, _TeamTotals] = defaultdict(_TeamTotals)
    for result in results:
        home = totals[result.home_team_id]
        home.home_matches += 1
        home.home_for += result.home_score
        home.home_against += result.away_score
        away = totals[result.away_team_id]
        away.away_matches += 1
        away.away_for += result.away_score
        away.away_against += result.home_score

    teams: dict[str, TeamRating] = {}
    for team_id, team in totals.items():
        if team.home_matches == 0 or team.away_matches == 0:
            continue
        teams[team_id] = TeamRating(
            team_id=team_id,
            home_matches=team.home_matches,
            away_matches=team.away_matches,
            home_attack=(team.home_for / team.home_matches) / league_home_average,
            home_defense=(team.home_against / team.home_matches) / league_away_average,
            away_attack=(team.away_for / team.away_matches) / league_away_average,
            away_defense=(team.away_against / team.away_matches) / league_home_average,
        )
    return RatingSet(
        league_home_average=league_home_average,
        league_away_average=league_away_average,
        teams=teams,
    )


def expected_goals(ratings: RatingSet, home_team_id: str, away_team_id: str) -> ExpectedGoals:
    if home_team_id == away_team_id:
        raise ValueError("home and away teams must be distinct")
    try:
        home = ratings.teams[home_team_id]
        away = ratings.teams[away_team_id]
    except KeyError as error:
        message = f"team {error.args[0]!r} lacks home or away history"
        raise InsufficientHistoryError(message) from error

    home_xg = ratings.league_home_average * home.home_attack * away.away_defense
    away_xg = ratings.league_away_average * away.away_attack * home.home_defense
    if not all(math.isfinite(value) and value >= 0 for value in (home_xg, away_xg)):
        raise ValueError("expected goals must be finite and non-negative")
    return ExpectedGoals(home=home_xg, away=away_xg)
