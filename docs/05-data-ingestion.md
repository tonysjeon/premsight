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

## Draft player snapshots

The draft pool is ingested separately from historical fixtures using the current Fantasy Premier League bootstrap feed. The adapter validates the external payload and normalizes teams and players before selection or persistence. This feed is undocumented, so production retains the last successful database snapshot instead of making product reads depend on provider availability.

Each successful run stores exactly 16 players for every club participating in the current Premier League season. Entries are an undifferentiated draft pool; PremSight does not label players as starters or substitutes. Selection excludes unavailable provider records, ranks players within each club using a deterministic tuple of availability, minutes, starts, total points, provider ownership, price, name, and provider ID, and retains the highest-ranked goalkeeper plus the highest-ranked 15 outfield players. Backup goalkeepers are deliberately excluded.

After club selection, FPL price descending assigns a unique `global_rank` across the retained pool, with the deterministic player-ranking tuple breaking equal-price ties. The Draft simulator samples captain choices from price ranks 1 through 15. This rank controls draft presentation only and does not classify a player as a starter, substitute, or reserve.

FPL only supplies the broad `GK`, `DEF`, `MID`, and `FWD` classifications; PremSight preserves that provider value separately from detailed-role enrichment.

A versioned static enrichment file adds primary and alternative EA FC 26 roles using the GPL-3.0 EAFC26 Player Database. Generation matches normalized FPL identity, club, and compatible broad role and publishes only high-confidence matches with a clear runner-up margin. The checked-in result is keyed by stable FPL player ID. Unmatched players keep their broad FPL role rather than receiving a guessed detailed position. Ingestion validates that at least one enriched role remains compatible with the FPL group while retaining cross-group alternatives such as `LW`/`LM`.

The adapter also resolves each player's FPL `region` through `/api/regions/` and stores the provider's two-character nationality code with the snapshot. Unknown non-null region IDs fail validation instead of producing an incorrect flag. FPL sometimes publishes a null region for selectable youth players; those entries retain a null nationality and the UI renders a neutral flag.

FPL's numeric `photo` identifier is validated and expanded to the official Premier League transparent `250x250` headshot URL before persistence. A missing photo remains null; malformed non-null identifiers fail ingestion.

The import fails before persistence if a club cannot supply one valid goalkeeper and 15 valid outfield players, or if a provider club cannot be mapped unambiguously to a current-season PremSight team. A complete run is written in one transaction. Product reads select the latest run for the requested season; if a refresh fails, the previous successful snapshot remains available.

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
| Product reads             | API                  |
| Prediction calculations   | prediction-engine    |

## References

- [System Architecture](./01-system-architecture.md)
- [Database Schema](./03-database-schema.md)
- [Testing](./10-testing.md)
- [football-data.org API reference](https://www.football-data.org/documentation/api)
- [football-data.org quickstart](https://www.football-data.org/documentation/quickstart)
