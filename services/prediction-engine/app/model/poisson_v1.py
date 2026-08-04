from __future__ import annotations

import math

import numpy as np
from scipy.stats import poisson

from app.domain.models import (
    ExpectedGoals,
    MatchResult,
    OutcomeProbabilities,
    Prediction,
    ScoreProbability,
)
from app.model.ratings import calculate_ratings, expected_goals

MODEL_VERSION = "poisson-v1"


def score_matrix(xg: ExpectedGoals, max_goals: int = 10) -> np.ndarray:
    if max_goals < 1 or max_goals > 20:
        raise ValueError("max_goals must be between 1 and 20")
    if not all(math.isfinite(value) and value >= 0 for value in (xg.home, xg.away)):
        raise ValueError("expected goals must be finite and non-negative")
    goals = np.arange(max_goals + 1)
    matrix = np.outer(poisson.pmf(goals, xg.home), poisson.pmf(goals, xg.away))
    total = float(matrix.sum())
    if not math.isfinite(total) or total <= 0:
        raise ValueError("score matrix has no finite probability mass")
    return matrix / total


def outcome_probabilities(matrix: np.ndarray) -> OutcomeProbabilities:
    if matrix.ndim != 2 or matrix.shape[0] != matrix.shape[1] or matrix.size == 0:
        raise ValueError("score matrix must be a non-empty square matrix")
    if not np.isfinite(matrix).all() or (matrix < 0).any():
        raise ValueError("score matrix must contain finite non-negative values")
    total = float(matrix.sum())
    if not math.isclose(total, 1.0, rel_tol=0, abs_tol=1e-10):
        raise ValueError("score matrix must sum to one")
    return OutcomeProbabilities(
        home_win=float(np.tril(matrix, k=-1).sum()),
        draw=float(np.trace(matrix)),
        away_win=float(np.triu(matrix, k=1).sum()),
    )


def most_likely_scores(matrix: np.ndarray, limit: int = 3) -> tuple[ScoreProbability, ...]:
    if limit < 1:
        raise ValueError("limit must be positive")
    scores = [
        ScoreProbability(home_goals=home, away_goals=away, probability=float(matrix[home, away]))
        for home in range(matrix.shape[0])
        for away in range(matrix.shape[1])
    ]
    return tuple(
        sorted(
            scores,
            key=lambda score: (-score.probability, score.home_goals, score.away_goals),
        )[:limit]
    )


def predict(
    results: list[MatchResult],
    home_team_id: str,
    away_team_id: str,
    max_goals: int = 10,
) -> Prediction:
    xg = expected_goals(calculate_ratings(results), home_team_id, away_team_id)
    matrix = score_matrix(xg, max_goals)
    return Prediction(
        model_version=MODEL_VERSION,
        home_team_id=home_team_id,
        away_team_id=away_team_id,
        expected_goals=xg,
        score_matrix=tuple(tuple(float(value) for value in row) for row in matrix),
        outcomes=outcome_probabilities(matrix),
        likely_scores=most_likely_scores(matrix),
    )
