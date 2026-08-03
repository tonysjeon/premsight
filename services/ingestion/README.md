# PremSight Ingestion

Service structure for future football data provider integrations.

**No provider integration is implemented yet.** Health endpoint only.

## Run locally

```bash
cd services/ingestion
uv sync
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8002
```

## Health

`GET /health` → `{ "status": "ok", "service": "premsight-ingestion" }`

## Tests

```bash
uv run pytest
```
