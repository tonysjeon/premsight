# Data Ingestion

## Purpose

Define how external football data enters PremSight and how provider payloads are normalized before persistence.

## Phase 3 scope

The first historical-data slice imports one Premier League season from `football-data.org`:

- competition and season metadata
- participating teams
- scheduled fixtures and completed results
- stable mappings between provider IDs and PremSight UUIDs

Standings are derived from completed fixtures. Live events, lineups, and public ingestion write endpoints remain out of scope.

## Architecture

```text
CLI/manual trigger
Interval scheduler (ingestion process)
      │
      ▼
HistoricalSyncService ──▶ FootballDataProvider (HTTP + normalization)
      │
      ▼
PostgresHistoricalRepository ──▶ PostgreSQL
```

The sync service consumes normalized provider models. It does not inspect vendor JSON. Provider adapters own authentication, HTTP behavior, status mapping, and payload validation. The repository owns transactions, provider-reference resolution, and database upserts. The scheduler and CLI call the same sync path.

## Providers

1. `football-data.org` v4 — Primary REST provider for current season, live fixtures, and schedule refreshes.
2. `openfootball` — Open public-domain data provider (`https://github.com/openfootball/england`) used to seed multiple historical Premier League seasons (e.g. 2021/22 through 2024/25) for Head-to-Head records and training match prediction models. Normalized via `OpenFootballProvider` in `app/providers/openfootball.py`.

## Architecture

Before production use, confirm that the selected plan and license allow the intended historical retention and public display. Provider credentials must only be supplied through environment variables.

Configuration:

| Variable                    | Required | Purpose                                                                |
| --------------------------- | -------- | ---------------------------------------------------------------------- |
| `FOOTBALL_DATA_API_TOKEN`   | yes      | Sent as the provider `X-Auth-Token` header                             |
| `FOOTBALL_DATA_BASE_URL`    | no       | Defaults to the provider v4 production URL                             |
| `DATABASE_URL`              | yes      | PostgreSQL connection used by the repository                           |
| `SCHEDULE_ENABLED`          | no       | Run the fixture refresh loop in the ingestion process (default: true)  |
| `SCHEDULE_INTERVAL_SECONDS` | no       | Seconds between refreshes; minimum 60 (default: 900, 15 minutes)       |
| `SCHEDULE_RUN_ON_STARTUP`   | no       | Sync once immediately when the process starts (default: true)          |
| `INGEST_COMPETITION`        | no       | Competition code for the scheduled job (default: `PL`)                 |
| `INGEST_SEASON_START_YEAR`  | no       | Override season start year; default is the current Premier League year |

## Normalized contract

The provider boundary returns:

- competition: provider ID, code, name, and country code
- season: provider ID, display name, start date, and end date
- teams: provider ID, name, short name, and optional TLA
- fixtures: provider ID, kickoff time, matchday, teams, normalized status, and optional final score

Provider statuses map to the database vocabulary:

| Provider status             | PremSight status |
| --------------------------- | ---------------- |
| `TIMED`, `SCHEDULED`        | `scheduled`      |
| `IN_PLAY`, `LIVE`, `PAUSED` | `live`           |
| `POSTPONED`, `SUSPENDED`    | `postponed`      |
| `CANCELLED`                 | `cancelled`      |
| `FINISHED`, `AWARDED`       | `completed`      |

Unknown statuses fail validation instead of silently producing incorrect match state.

## Idempotency and transactions

- Provider identity is resolved through `provider_references`.
- Competition and season natural keys are reused before a provider mapping is attached.
- Teams and fixtures are updated only after their provider mapping is resolved.
- One season sync is committed as one transaction; a failure rolls it back.
- Replaying the same normalized snapshot updates records without creating duplicates.

## HTTP and failure behavior

- Use explicit connect/read timeouts.
- Retry only transient transport failures, HTTP `429`, and `5xx` responses.
- Respect `Retry-After` when supplied and otherwise use bounded exponential backoff.
- Do not retry authentication, permission, or malformed-payload failures.
- Log job start, completion counts, provider, competition, season, and failures without logging credentials or full provider payloads.

The initial sync performs two coarse provider requests—teams and matches—to stay within the provider's documented request limits (10 requests per minute on the registered free plan). Distributed rate limiting across multiple ingestion replicas is out of scope; run a single ingestion process.

## Scheduled fixture refresh

The ingestion service owns the job. Product API, web, and prediction-engine processes do not call the provider.

When `SCHEDULE_ENABLED` is true and `FOOTBALL_DATA_API_TOKEN` is set, the process:

1. Optionally runs one sync at startup
2. Replays the current competition season on a fixed interval
3. Skips a tick if the previous run is still in progress
4. Logs failures and waits for the next interval instead of exiting

The current Premier League season start year is August-based in UTC: on or after 1 August the year is `Y`; before that it is `Y - 1`. Set `INGEST_SEASON_START_YEAR` only to pin a specific season.

This job refreshes delayed full-time results and remaining fixtures. It is not a live match feed. In-play events remain a later phase.

Docker Compose starts this scheduler with the rest of the stack. The CLI remains the operator path for backfill and ad-hoc replays:

```bash
uv run premsight-ingest historical-season --competition PL --season 2026
```

## Historical backfill

Backfill one season at a time, oldest to newest. A season is safe to replay. Operators should record failed seasons and retry them rather than partially advancing a multi-season job.

## Standings decision

Phase 3 standings are calculated from fixtures with `status = 'completed'`. PremSight does not persist provider standings or standings snapshots yet. This keeps results as the source of truth and makes calculations deterministic and testable. Snapshot persistence can be added later if API performance requires it.

The ordering implemented for the historical-data milestone is points, goal difference, goals scored, then team name as a deterministic fallback. Competition-specific head-to-head or playoff rules must be added before supporting competitions whose official rules require them.

## Draft player snapshots

The draft pool is ingested separately from historical fixtures using the current Fantasy Premier League bootstrap feed. The adapter validates the external payload and normalizes teams and players before selection or persistence. This feed is undocumented, so production retains the last successful database snapshot instead of making product reads depend on provider availability.

Each successful run stores exactly 11 projected starters for every club participating in the current Premier League season. Selection evaluates every supported formation, assigns distinct players to compatible detailed roles, and publishes the valid XI with the highest total EA FC rating. This is a deterministic projected first-choice lineup, not a claim about the lineup for a particular fixture.

EA FC overall ratings are retained during detailed-position enrichment and used directly as PremSight player ratings. The model is versioned as `ea-fc-v1`; FPL performance does not modify player ratings.

After XI selection, EA FC rating descending assigns a unique `global_rank` across the retained pool, with FPL price and the deterministic player-ranking tuple breaking ties. The Draft simulator samples captain choices from ranks 1 through 15. This rank controls draft presentation only and does not classify a player as a starter, substitute, or reserve.

FPL only supplies the broad `GK`, `DEF`, `MID`, and `FWD` classifications; PremSight preserves that provider value separately from detailed-role enrichment.

A versioned static enrichment file adds EA FC 26 overall ratings plus primary and alternative roles using the GPL-3.0 EAFC26 Player Database. Generation matches normalized FPL identity, club, and compatible broad role and publishes only high-confidence matches with a clear runner-up margin. The checked-in result is keyed by stable FPL player ID. Unmatched players keep their broad FPL role and no EA rating rather than receiving guessed data; they cannot enter the projected XI. Ingestion validates that at least one enriched role remains compatible with the FPL group while retaining cross-group alternatives such as `LW`/`LM`.

The adapter also resolves each player's FPL `region` through `/api/regions/` and stores the provider's two-character nationality code with the snapshot. Unknown non-null region IDs fail validation instead of producing an incorrect flag. FPL sometimes publishes a null region for selectable youth players; those entries retain a null nationality and the UI renders a neutral flag.

FPL's numeric `photo` identifier is validated and expanded to the official Premier League transparent `250x250` headshot URL before persistence. A missing photo remains null; malformed non-null identifiers fail ingestion.

The import fails before persistence if a club cannot produce a complete valid XI with EA FC ratings, or if a provider club cannot be mapped unambiguously to a current-season PremSight team. A complete run is written in one transaction. Product reads select the latest run for the requested season; if a refresh fails, the previous successful snapshot remains available.

Club mapping normally uses the provider TLA. Provider-specific aliases are explicit at the ingestion boundary; for example, FPL's `NFO` maps to football-data.org's `NOT` for Nottingham Forest. Unknown differences still fail the import instead of being guessed from display names.

Manual refresh:

```bash
uv run premsight-ingest player-snapshot
```

Automated scheduling is a deployment concern; daily refresh is the recommended initial cadence.

## Ownership

| Concern                   | Owner                |
| ------------------------- | -------------------- |
| Provider auth and HTTP    | ingestion            |
| Vendor payload validation | provider adapter     |
| Normalization             | provider adapter     |
| Idempotent persistence    | ingestion repository |
| Scheduled fixture refresh | ingestion            |
| Product reads             | API                  |
| Prediction calculations   | prediction-engine    |

## References

- [System Architecture](./01-system-architecture.md)
- [Database Schema](./03-database-schema.md)
- [Testing](./10-testing.md)
- [football-data.org API reference](https://www.football-data.org/documentation/api)
- [football-data.org quickstart](https://www.football-data.org/documentation/quickstart)
