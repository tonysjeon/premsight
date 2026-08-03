# PremSight API

FastAPI HTTP API for PremSight. Domain endpoints are not implemented yet.

## Run locally

```bash
cd services/api
uv sync
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Health

`GET /health` → `{ "status": "ok", "service": "premsight-api" }`

## Tests

```bash
uv run pytest
```
