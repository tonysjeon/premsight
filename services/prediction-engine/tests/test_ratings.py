import math

import pytest

from app.domain.models import MatchResult
from app.model.ratings import InsufficientHistoryError, calculate_ratings, expected_goals
from tests.fixtures import balanced_history


def test_ratings_and_expected_goals_are_finite_and_deterministic() -> None:
    ratings = calculate_ratings(balanced_history())

    first = expected_goals(ratings, "A", "B")
    second = expected_goals(ratings, "A", "B")

    assert first == second
    assert first.home >= 0
    assert first.away >= 0
    assert math.isfinite(first.home)
    assert math.isfinite(first.away)
    assert ratings.teams["A"].home_matches == 2
    assert ratings.teams["A"].away_matches == 2


def test_empty_or_unknown_team_history_is_rejected() -> None:
    with pytest.raises(InsufficientHistoryError, match="at least one"):
        calculate_ratings([])

    ratings = calculate_ratings(
        [MatchResult(home_team_id="A", away_team_id="B", home_score=1, away_score=1)]
    )
    with pytest.raises(InsufficientHistoryError, match="lacks"):
        expected_goals(ratings, "A", "UNKNOWN")


def test_zero_scoring_league_is_rejected() -> None:
    results = [MatchResult(home_team_id="A", away_team_id="B", home_score=0, away_score=0)]
    with pytest.raises(InsufficientHistoryError, match="averages must be positive"):
        calculate_ratings(results)
