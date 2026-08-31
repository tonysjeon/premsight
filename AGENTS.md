# AGENTS.md

Context and engineering standards for AI agents working on PremSight.

## What this product is

PremSight is a Premier League application: fixtures, results, standings, team and match hubs, a Draft XI simulator, and Poisson-based pre-match probabilities. Scope is **Premier League only** (`competitions.code = 'PL'`). Do not add other leagues unless the product explicitly expands.

Treat this codebase as a long-lived product: correctness, modularity, and clear boundaries over clever shortcuts.

## Current status

Implemented:

- Monorepo, Docker Compose, GitHub Actions CI
- PostgreSQL core football schema, reversible migrations, PL seed
- Ingestion from football-data.org, openfootball backfill, FPL player snapshots, rosters & FBref stats
- Product API for seasons, teams, fixtures, standings, predictions, players, rosters, scout percentiles & compare, draft catalog, Google sign-in
- Next.js surfaces: home overview, table, fixtures, match hub, team hub (with full squad roster), Draft XI, Compare page
- Isolated `poisson-v1` prediction service
- Vercel config for `apps/web` (frontend only; API/Postgres are not on Vercel)

Not done (do not fake these with UI-only stubs):

- Live match events / real-time updates (`match_events` exists in the schema; no live engine yet)
- Redis-backed caching or pub/sub (Redis is in Compose; app code does not use it yet)
- Cloud / IaC (`infrastructure/` is a placeholder)
- Shared TypeScript domain contracts in `packages/shared-types` (still health-only; web types live in `apps/web/src/lib/api.ts` and related modules)

There is **no `docs/` tree**. Service READMEs cover how to run each package. Record architectural decisions here or in the relevant package README when behavior changes.

## Architecture

```text
apps/web (Next.js)  -->  services/api (FastAPI)  -->  PostgreSQL
                              |
                              +--> services/prediction-engine (FastAPI + NumPy/SciPy)
                              |
services/ingestion            -->  PostgreSQL
  (scheduler + premsight-ingest CLI)
```

Rules:

- Keep UI, HTTP API, ingestion, and prediction **loosely coupled**.
- **Never** put Poisson / rating math in `services/api` or `apps/web`. The API only loads vectors/results and calls the prediction engine.
- Share contracts (types, SQL schema), not copied business logic.
- Ingestion owns provider adapters and writes; the API owns reads for the product.

## Repository map

| Path                                    | Role                                                          |
| --------------------------------------- | ------------------------------------------------------------- |
| `apps/web`                              | Next.js 16 App Router UI (`@premsight/web`)                   |
| `services/api`                          | Product HTTP API (port 8000)                                  |
| `services/prediction-engine`            | Isolated `poisson-v1` (port 8001)                             |
| `services/ingestion`                    | Provider sync, scheduler, `premsight-ingest` CLI (port 8002)  |
| `packages/database`                     | SQL migrations, seeds, `premsight-db` CLI, schema tests       |
| `packages/shared-types`                 | Intended shared TS contracts; currently `HealthResponse` only |
| `infrastructure/`                       | Future IaC — unused                                           |
| `.github/workflows/ci.yml`              | Frontend, backend, database, and Postgres integration jobs    |
| `.github/workflows/ingest-fixtures.yml` | Hourly Premier League fixture/result ingest (Actions secrets) |
| `docker-compose.yml`                    | Full local stack                                              |
| `.cursor/rules.md`                      | Short engineering principles (same intent as this file)       |

Python services use `uv` and `app/` packages. The API and ingestion Docker builds take `packages/database` as an additional build context.

## Local stack

Prerequisites: Node 22+, pnpm 11.15.1, uv, Python 3.12, Docker.

```bash
cp .env.example .env   # set FOOTBALL_DATA_API_TOKEN for scheduled fixture refresh
docker compose up --build
```

| Service    | URL / port                                                                           |
| ---------- | ------------------------------------------------------------------------------------ |
| Web        | http://localhost:3000                                                                |
| API        | http://localhost:8000 (`GET /health`)                                                |
| Prediction | http://localhost:8001 (`GET /health`)                                                |
| Ingestion  | http://localhost:8002 (`GET /health`)                                                |
| PostgreSQL | **localhost:5433** (container 5432) — 5433 avoids clashing with other local Postgres |
| Redis      | localhost:6379                                                                       |

Native web: `pnpm install` then `pnpm dev:web`. Native Python: `cd services/<name> && uv sync` then uvicorn as in the README.

Without `FOOTBALL_DATA_API_TOKEN`, ingestion stays healthy and **skips** the scheduler. Do not use `--reload` on ingestion while the scheduler is enabled (reloads replay provider requests).

Never commit `.env`. Use `.env.example` for new variables.

## Database

Package: `packages/database`. Migrations are paired `NNNN_name.up.sql` / `NNNN_name.down.sql`. Applied versions live in `schema_migrations`.

```bash
cd packages/database && uv sync --all-groups
uv run premsight-db up
uv run premsight-db seed
uv run premsight-db status
uv run premsight-db down          # one step; --all rolls back everything
```

Core tables: `competitions`, `seasons` (at most one `is_current` per competition), `teams`, `fixtures`, `match_events`, `provider_references`. Later migrations add `crest_url`, `player_snapshot_runs` / `player_snapshot_entries` (Draft XI catalog: positions, global rank, nationality, photo, EA rating), and `users` (Google accounts; emails stored lowercase; optional Google avatar URL).

Fixture `status` is one of: `scheduled`, `live`, `postponed`, `cancelled`, `completed`. Completed rows must have both scores. Home and away teams must differ. Season FKs bind `(season_id, competition_id)`.

Seed `seeds/001_premier_league.sql` upserts competition `PL` and marks **2026/2027** current (campaign dates around 2026-08-14 → 2027-05-31).

Provider references make team/fixture imports idempotent. Do not invent a second identity scheme.

**Tests rebuild the schema.** `DATABASE_URL` dbname **must** end in `_test` or pytest fails. Host port in Compose is 5433.

Standings are **derived from completed fixtures**, not a stored table. League table UI also uses form from recent results in `apps/web/src/lib/season.ts`.

## Product API (`services/api`)

Prefix `/v1`. Persistence via `FootballRepository` (psycopg, dict rows). CORS from `API_CORS_ORIGINS`.

| Method | Path                           | Notes                                                                                                                     |
| ------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/health`                      | `{ status, service }`                                                                                                     |
| GET    | `/v1/seasons/current`          | 404 if none                                                                                                               |
| GET    | `/v1/seasons`                  | `{ items, count }`                                                                                                        |
| GET    | `/v1/teams`                    | optional `season_id`                                                                                                      |
| GET    | `/v1/teams/{id}`               | includes that team's fixtures                                                                                             |
| GET    | `/v1/fixtures`                 | `season_id`, `status`, `team_id`                                                                                          |
| GET    | `/v1/fixtures/{id}`            | includes `events`                                                                                                         |
| GET    | `/v1/fixtures/{id}/prediction` | proxies prediction engine; 422/503 on insufficient history / down                                                         |
| GET    | `/v1/standings?season_id=`     | computed                                                                                                                  |
| GET    | `/v1/players`                  | list/search; `has_stats` with no `position` is all scout CSVs; GK/CB/FB/MID/ST/WG `has_stats` uses those CSVs (not FBref) |
| GET    | `/v1/players/{id}`             | player identity, stats, archetype                                                                                         |
| GET    | `/v1/teams/{id}/roster`        | squad members grouped by position                                                                                         |
| GET    | `/v1/player-snapshots/latest`  | Draft XI catalog                                                                                                          |
| POST   | `/v1/auth/logout`              | clear session cookie                                                                                                      |
| GET    | `/v1/auth/me`                  | current user or 401                                                                                                       |
| GET    | `/v1/auth/providers`           | which OAuth providers are configured                                                                                      |
| GET    | `/v1/auth/google/start`        | redirect to Google OAuth                                                                                                  |
| GET    | `/v1/auth/google/callback`     | Google callback; sets cookie; redirects to the web                                                                        |
| DELETE | `/v1/auth/me`                  | delete the signed-in account and clear the session cookie                                                                 |

Sign-in is Google OAuth. Accounts live in `users` plus `oauth_identities`. Sessions are a signed JWT in the `premsight_session` cookie. Set `AUTH_SECRET` in production and the Google OAuth env vars. The web client opens a modal, then navigates the browser to the start URL. The profile page at `/profile` shows the Google photo, sign-out, delete account, and saved-collection tabs.

The web client maps 422/503 on prediction to `null` (hide the module, do not error the page).

Layout: `app/main.py`, `app/api/routes/`, `app/core/config.py` (pydantic-settings), `app/repositories/`, `app/clients/prediction.py`. Keep HTTP adapters, SQL, and outbound clients separate.

## Prediction engine

`POST /v1/predict` with `home_team_id`, `away_team_id`, `results` (completed matches), optional `max_goals` (1–20, default 10).

`poisson-v1`: attack/defense ratings from history → independent Poisson score matrix → **normalize** so the matrix sums to 1 → 1X2 outcomes + top likely scores. Domain models are frozen Pydantic. Raise `InsufficientHistoryError` (HTTP 422) rather than guessing.

Version models (`MODEL_VERSION`). Keep calculations deterministic and unit-tested (`tests/test_poisson_v1.py`, `test_ratings.py`).

## Ingestion

Providers (normalize into domain snapshots; do not leak provider JSON into the API):

- `football_data` — football-data.org v4 (token required for live refresh)
- `openfootball` — historical seasons, no token
- `fpl` — Fantasy Premier League for player catalog / photos / positions

CLI (`premsight-ingest`):

```bash
uv run premsight-ingest historical-season --competition PL --season 2026
uv run premsight-ingest openfootball-season --season 2023
uv run premsight-ingest player-snapshot
uv run premsight-ingest refresh
```

Scheduler: current PL season. Full schedule sync at startup when idle (and about daily). Result pulls only in a match window (15 minutes before kickoff until the fixture is completed/cancelled/postponed). Idle otherwise. Requires token + `SCHEDULE_ENABLED`. Production without a paid ingest instance can run `refresh` from GitHub Actions (`.github/workflows/ingest-fixtures.yml`) against the same Postgres the API uses.

Player snapshot: one projected XI per club from EA FC ratings and valid formations; `global_rank` orders the captain pool. Position overrides live in `services/ingestion/app/data/`.

## Frontend (`apps/web`)

Stack: Next.js App Router, React 19, TypeScript **strict**, Tailwind 4, Manrope, `data-theme` light/dark (default dark, `localStorage` key `premsight-theme`). Pages are `force-dynamic` where they hit the API.

Routes:

| Path            | Purpose                                       |
| --------------- | --------------------------------------------- |
| `/`             | Overview: table snapshot + selected matchday  |
| `/table`        | Full table                                    |
| `/fixtures`     | Fixtures / results                            |
| `/matches/[id]` | Match hub (hero, H2H, form, prediction)       |
| `/teams/[id]`   | Team hub (fixtures, form, squad roster)       |
| `/draft`        | Draft XI simulator                            |
| `/compare`      | Player similarity & radar comparison          |
| `/profile`      | Signed-in account: photo, collections, delete |

Season is a `?season=` query on Overview / Table / Fixtures. Match and team pages, Draft, and Profile hide that season chrome. Preserve `season` when linking those list routes.

Conventions:

- Fetch football data through `apps/web/src/lib/api.ts` and `src/lib/fpl.ts`. Auth uses `src/lib/auth.ts` from the browser. Server-side requests use `getApiBase()` in `src/lib/api-base.ts` (`INTERNAL_API_URL`, then `NEXT_PUBLIC_API_URL`).
- **Vercel** hosts only Next.js. Import the GitHub repo, set Root Directory to `apps/web`, Node.js 22. Set `INTERNAL_API_URL` and `NEXT_PUBLIC_API_URL` to the deployed product API origin (no trailing slash). Add that Vercel origin to `API_CORS_ORIGINS` on the API. Config: `apps/web/vercel.json`. Docker still uses `output: 'standalone'`; Vercel builds omit it.
- Pure season/table/form/H2H helpers live in `src/lib/season.ts` (UTC formatters so SSR is deterministic). Team display names/crests in `src/lib/teams.ts`. Draft scoring in `src/lib/draft-score.ts`. Theme in `src/lib/theme.ts`. Sign-in session helpers in `src/lib/auth.ts`. Profile helpers in `src/lib/profile.ts`. Sliding tab underline math in `src/lib/tab-indicator.ts`.
- Alias `@/` → `src/`.
- Prefer composition: small components under `src/components/`; keep scoring and grouping out of JSX.
- Do not call the prediction engine from the browser; go through the product API.

Frontend unit tests: `node --test` on `src/lib/*.test.mjs` (see `apps/web/package.json`). Add tests next to new lib logic.

## Tooling and quality

Root (pnpm workspaces `apps/*`, `packages/*`):

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm format:check
```

Prettier: semicolons, single quotes, trailing commas, printWidth 100.

Python (each of `services/api`, `services/prediction-engine`, `services/ingestion`, `packages/database`):

```bash
uv sync --all-groups
uv run ruff check .
uv run pytest
```

Ruff: line length 100, Python 3.12, lint `E,F,I,UP`. Type Python; validate external input with Pydantic / query constraints; handle errors explicitly (HTTPException, typed client errors). No hidden side effects in domain functions.

Do not merge with failing tests. CI matches the commands above plus Postgres integration for database, ingestion, and API.

## Where to put new work

| Change                               | Put it here                                                                                                                   |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| SQL / constraints / seeds            | `packages/database` + tests                                                                                                   |
| Provider fetch / mapping / scheduler | `services/ingestion`                                                                                                          |
| Product HTTP + SQL reads             | `services/api`                                                                                                                |
| Model math, new model version        | `services/prediction-engine` only                                                                                             |
| Pages, components, client UX         | `apps/web`                                                                                                                    |
| Cross-language DTO                   | Prefer extending `packages/shared-types` rather than duplicating; until then keep web types in `api.ts` in sync with API JSON |

Do not add a new service or package without a clear boundary and tests.

## Agent workflow

1. Read this file and the README of the package you will touch.
2. Match existing layout (routes vs repositories vs domain vs lib tests).
3. Keep diffs focused — no drive-by refactors or unrelated formatting.
4. Add or update unit tests for business logic; integration tests when touching SQL or provider sync.
5. After UI changes, verify the real flow (not only a screenshot): affected routes, `?season=` consistency, empty/error states, and light/dark if theming changed.

## Guiding principles

- Strict typing; small testable functions; composition over duplication.
- Validate all external input; fail closed on provider/API errors.
- Prediction outputs must stay normalized and versioned.
- Name things for the football domain (`fixture`, `matchday`, `standing`), not generic `data`/`item` dumps at module boundaries.
