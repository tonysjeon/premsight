from fastapi.testclient import TestClient

from app.main import app
from tests.fixtures import balanced_history

client = TestClient(app)


def test_prediction_endpoint_returns_versioned_probabilities() -> None:
    response = client.post(
        "/v1/predict",
        json={
            "home_team_id": "A",
            "away_team_id": "B",
            "results": [result.model_dump() for result in balanced_history()],
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["model_version"] == "poisson-v1"
    assert abs(sum(payload["outcomes"].values()) - 1) < 1e-12
    assert len(payload["likely_scores"]) == 5


def test_prediction_endpoint_reports_insufficient_history() -> None:
    response = client.post(
        "/v1/predict",
        json={
            "home_team_id": "A",
            "away_team_id": "UNKNOWN",
            "results": [
                {
                    "home_team_id": "A",
                    "away_team_id": "B",
                    "home_score": 1,
                    "away_score": 1,
                }
            ],
        },
    )

    assert response.status_code == 422
    assert "lacks" in response.json()["detail"]
