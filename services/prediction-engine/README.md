# PremSight Prediction Engine

Isolated FastAPI service for Poisson-based predictions.

Implements the versioned `poisson-v1` pre-match model. Prediction calculations remain isolated from the product API and frontend.

## Run locally

```bash
cd services/prediction-engine
uv sync
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

## Health

`GET /health` → `{ "status": "ok", "service": "premsight-prediction-engine" }`

## Predict

`POST /v1/predict` accepts completed fixture history plus the home and away team IDs. It returns the `poisson-v1` expected goals, normalized outcome probabilities, score matrix, and most likely scores.

The product API exposes these estimates for scheduled fixtures at `GET /v1/fixtures/{id}/prediction`.

## Tests

```bash
uv run pytest
```
