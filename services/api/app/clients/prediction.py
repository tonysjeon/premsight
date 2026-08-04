from typing import Any

import httpx


class PredictionServiceError(RuntimeError):
    def __init__(self, status_code: int, detail: str) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


class PredictionClient:
    def __init__(self, base_url: str) -> None:
        self._base_url = base_url.rstrip("/")

    def predict(
        self,
        home_team_id: str,
        away_team_id: str,
        results: list[dict[str, Any]],
    ) -> dict[str, Any]:
        try:
            response = httpx.post(
                f"{self._base_url}/v1/predict",
                json={
                    "home_team_id": home_team_id,
                    "away_team_id": away_team_id,
                    "results": results,
                },
                timeout=10,
            )
        except httpx.HTTPError as error:
            raise PredictionServiceError(503, "Prediction service unavailable") from error
        if response.status_code == 422:
            detail = response.json().get("detail", "Insufficient history")
            raise PredictionServiceError(422, detail)
        if response.is_error:
            raise PredictionServiceError(503, "Prediction service unavailable")
        return response.json()
