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

## Tests

```bash
uv run pytest
```
