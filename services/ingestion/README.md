# PremSight Ingestion

Imports historical Premier League teams, fixtures, and results through provider adapters. The initial adapter targets `football-data.org` v4.

## Run locally

```bash
cd services/ingestion
uv sync
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8002
```

## Health

`GET /health` → `{ "status": "ok", "service": "premsight-ingestion" }`

## Historical sync

Configure `DATABASE_URL` and `FOOTBALL_DATA_API_TOKEN`, then run:

```bash
uv run premsight-ingest historical-season --competition PL --season 2025
```

The command is safe to replay; provider references make team and fixture imports idempotent.

## Tests

```bash
uv run pytest
```
