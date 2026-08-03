import math

import numpy as np
import pytest

from app.domain.models import ExpectedGoals
from app.model.poisson_v1 import (
    MODEL_VERSION,
    outcome_probabilities,
    predict,
    score_matrix,
)
from tests.fixtures import balanced_history, symmetric_history


def test_prediction_probabilities_are_normalized_and_deterministic() -> None:
    first = predict(balanced_history(), "A", "B")
    second = predict(balanced_history(), "A", "B")

    assert first == second
    assert first.model_version == MODEL_VERSION
    assert math.isclose(sum(sum(row) for row in first.score_matrix), 1.0, abs_tol=1e-12)
    assert math.isclose(
        first.outcomes.home_win + first.outcomes.draw + first.outcomes.away_win,
        1.0,
        abs_tol=1e-12,
    )
    assert all(score.probability >= 0 for score in first.likely_scores)
    assert list(first.likely_scores) == sorted(
        first.likely_scores,
        key=lambda score: (-score.probability, score.home_goals, score.away_goals),
    )


def test_symmetric_inputs_produce_symmetric_outcomes() -> None:
    prediction = predict(symmetric_history(), "A", "B")
    assert prediction.expected_goals.home == prediction.expected_goals.away
    assert math.isclose(
        prediction.outcomes.home_win,
        prediction.outcomes.away_win,
        abs_tol=1e-12,
    )


def test_matrix_validation_rejects_invalid_configuration() -> None:
    with pytest.raises(ValueError, match="between 1 and 20"):
        score_matrix(ExpectedGoals(home=1.2, away=0.8), max_goals=0)
    with pytest.raises(ValueError, match="sum to one"):
        outcome_probabilities(np.ones((2, 2)))
