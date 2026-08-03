# Data Ingestion

## Purpose

Define how external football data enters PremSight and how provider payloads are normalized before persistence.

## Phase 3 scope

The first historical-data slice imports one Premier League season from `football-data.org`:

- competition and season metadata
- participating teams
- scheduled fixtures and completed results
- stable mappings between provider IDs and PremSight UUIDs

Standings are derived from completed fixtures. Live events, lineups, scheduled jobs, and public ingestion endpoints remain out of scope.

## Architecture

```text
CLI/manual trigger
      │
      ▼
HistoricalSyncService ──▶ FootballDataProvider (HTTP + normalization)
      │
      ▼
PostgresHistoricalRepository ──▶ PostgreSQL
```

The sync service consumes normalized provider models. It does not inspect vendor JSON. Provider adapters own authentication, HTTP behavior, status mapping, and payload validation. The repository owns transactions, provider-reference resolution, and database upserts.

## Initial provider decision

`football-data.org` v4 is the initial adapter because it exposes Premier League teams and competition matches with season filters through a small REST surface. The provider remains replaceable; no external identifier is used as a PremSight primary key.

Before production use, confirm that the selected plan and license allow the intended historical retention and public display. Provider credentials must only be supplied through environment variables.

Configuration:

| Variable                  | Required | Purpose                                      |
| ------------------------- | -------- | -------------------------------------------- |
| `FOOTBALL_DATA_API_TOKEN` | yes      | Sent as the provider `X-Auth-Token` header   |
| `FOOTBALL_DATA_BASE_URL`  | no       | Defaults to the provider v4 production URL   |
| `DATABASE_URL`            | yes      | PostgreSQL connection used by the repository |

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

The initial manual sync performs two coarse provider requests—teams and matches—to stay within the provider's documented request limits. Scheduling and distributed rate limiting are deferred until automated jobs are introduced.

## Historical backfill

Backfill one season at a time, oldest to newest. A season is safe to replay. Operators should record failed seasons and retry them rather than partially advancing a multi-season job.

## Standings decision

Phase 3 standings are calculated from fixtures with `status = 'completed'`. PremSight does not persist provider standings or standings snapshots yet. This keeps results as the source of truth and makes calculations deterministic and testable. Snapshot persistence can be added later if API performance requires it.

The ordering implemented for the historical-data milestone is points, goal difference, goals scored, then team name as a deterministic fallback. Competition-specific head-to-head or playoff rules must be added before supporting competitions whose official rules require them.

## Ownership

| Concern                   | Owner                |
| ------------------------- | -------------------- |
| Provider auth and HTTP    | ingestion            |
| Vendor payload validation | provider adapter     |
| Normalization             | provider adapter     |
| Idempotent persistence    | ingestion repository |
| Product reads             | API                  |
| Prediction calculations   | prediction-engine    |

## References

- [System Architecture](./01-system-architecture.md)
- [Database Schema](./03-database-schema.md)
- [Testing](./10-testing.md)
- [football-data.org API reference](https://www.football-data.org/documentation/api)
- [football-data.org quickstart](https://www.football-data.org/documentation/quickstart)
