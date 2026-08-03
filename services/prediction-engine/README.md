# PremSight Prediction Engine

Isolated FastAPI service for Poisson-based predictions.

NumPy, pandas, and SciPy are installed for future model work. **No prediction logic is implemented yet.**

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
