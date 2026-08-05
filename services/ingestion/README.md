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

## Player snapshot

After the current season and its fixtures are synchronized, store the latest curated draft pool:

```bash
uv run premsight-ingest player-snapshot
```

The import stores 16 equally draftable players per club: the highest-ranked goalkeeper and 15 highest-ranked outfield players. It does not assign starter or bench roles. Global rank is ordered by FPL price and powers the top-15 captain pool.

## Tests

```bash
uv run pytest
```
