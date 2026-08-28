# PremSight Ingestion

Imports historical Premier League teams, fixtures, and results through provider adapters. The initial adapter targets `football-data.org` v4.

## Run locally

```bash
cd services/ingestion
uv sync
uv run uvicorn app.main:app --host 0.0.0.0 --port 8002
```

When `FOOTBALL_DATA_API_TOKEN` is set, this process refreshes the current Premier League season at startup and every 15 minutes. Compose enables the same scheduler. Omit `--reload` while the scheduler is running.

## Health

`GET /health` → `{ "status": "ok", "service": "premsight-ingestion" }`

## Historical sync

Configure `DATABASE_URL` and `FOOTBALL_DATA_API_TOKEN`, then run:

```bash
uv run premsight-ingest historical-season --competition PL --season 2026
```

To sync historical seasons directly from `openfootball` (public domain, no API token needed):

```bash
uv run premsight-ingest openfootball-season --season 2023
```

The command is safe to replay; provider references make team and fixture imports idempotent. Use it for backfill or an immediate refresh; the scheduled job covers ongoing current-season updates.

## Player snapshot

After the current season and its fixtures are synchronized, store the latest curated draft pool:

```bash
uv run premsight-ingest player-snapshot
```

The import stores one projected starting XI per club by maximizing EA FC overall ratings across supported valid formations. Global rank is ordered by EA FC rating and powers the top-15 captain pool.

## Tests

```bash
uv run pytest
```
