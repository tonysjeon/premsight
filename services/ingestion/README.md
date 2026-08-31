# PremSight Ingestion

Imports historical Premier League teams, fixtures, and results through provider adapters. The initial adapter targets `football-data.org` v4.

## Run locally

```bash
cd services/ingestion
uv sync
uv run uvicorn app.main:app --host 0.0.0.0 --port 8002
```

When `FOOTBALL_DATA_API_TOKEN` is set, this process starts a fixture scheduler:

- **Schedule sync** — full current PL season from football-data.org at startup (if no match is in flight) and about once a day for postponements.
- **Result sync** — only inside a match window: from 15 minutes before kickoff until that fixture is `completed`, `cancelled`, or `postponed`. Live or kicked-off games poll about every 60 seconds; pre-kickoff uses about 3 minutes. Completed scores are not overwritten.
- **Idle** — no matches API calls until the next kickoff window (or the next daily schedule sync).

Compose enables the same scheduler. Omit `--reload` while the scheduler is running.

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

The command is safe to replay; provider references make team and fixture imports idempotent. Use it for backfill or an immediate full-season refresh. The scheduler covers match-window result updates.

## GitHub Actions (production without a paid ingest process)

Vercel only hosts the Next.js app. The Render API process does not run the scheduler. For an unpaid production refresh, run one match-window tick from GitHub Actions against the same Postgres the API uses.

Workflow: `.github/workflows/ingest-fixtures.yml`

1. Add repository secrets (Settings → Secrets and variables → Actions):
   - `INGEST_DATABASE_URL` — Render Postgres **External** URL, with `sslmode=require` if the URL does not already include it.
   - `FOOTBALL_DATA_API_TOKEN` — football-data.org v4 token.
2. Merge the workflow to the default branch (`main`). Scheduled workflows only run from that branch.
3. Actions → **Fixture refresh** → **Run workflow** to confirm the first tick. Cron then runs hourly (`17 * * * *`).

The command is `premsight-ingest refresh`: result sync only inside a match window; a full schedule sync if the current season has no fixtures or the last write is older than about a day; otherwise idle. GitHub may delay cron by several minutes, so this is not a live 60-second poll.

Private repositories have a monthly Actions minute cap. Hourly is the default. Tighten the cron only if you need faster matchday updates and have minutes to spare.

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
