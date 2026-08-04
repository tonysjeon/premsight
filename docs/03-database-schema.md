# Database Schema

## Purpose

Define how PremSight persists football data in PostgreSQL for historical fixtures and future live matches, and how migrations, seeds, and constraints are managed.

## Overview

Schema lives under `packages/database`. Bootstrap left a placeholder `schema_meta` marker only. This document specifies the first domain schema for Phase 2 (core data model).

Internal application IDs are independent of external provider IDs. Provider mappings live in `provider_references`.

All timestamps are stored as `TIMESTAMPTZ` and treated as UTC.

## Goals

- Persist competitions, seasons, teams, fixtures, and match events needed for historical and live match flows
- Keep PremSight entity IDs stable across provider changes
- Enforce integrity with foreign keys, unique constraints, and check constraints
- Ship ordered, reversible migrations plus seed data and automated tests

## Non-goals (core football phase)

- Canonical player careers, lineups, users, favorites, predictions, team ratings, standings snapshots
- Live ingestion jobs or football-provider SDK integrations
- Poisson / prediction tables
- Choosing a production ORM for the API (SQLAlchemy remains deferred; migrations use plain SQL + `premsight-db`)

## Entity relationship overview

```text
competitions 1──* seasons
competitions 1──* fixtures
seasons      1──* fixtures
teams        1──* fixtures (as home)
teams        1──* fixtures (as away)
fixtures     1──* match_events
teams        1──* match_events (optional team side)

provider_references  (polymorphic map: provider + entity_type + provider_entity_id
                      ↔ internal entity_id)

player_snapshot_runs 1──* player_snapshot_entries
teams                1──* player_snapshot_entries
```

## Tables

### `competitions`

A football competition PremSight can track (MVP: Premier League only).

| Column         | Type          | Null | Notes                              |
| -------------- | ------------- | ---- | ---------------------------------- |
| `id`           | `UUID`        | no   | PK; internal ID                    |
| `code`         | `TEXT`        | no   | Stable short code, e.g. `PL`       |
| `name`         | `TEXT`        | no   | Display name                       |
| `country_code` | `TEXT`        | yes  | ISO 3166-1 alpha-2 when applicable |
| `created_at`   | `TIMESTAMPTZ` | no   | Default `now()`                    |
| `updated_at`   | `TIMESTAMPTZ` | no   | Default `now()`                    |

**Constraints / indexes**

- `UNIQUE (code)`
- Index on `name` not required for MVP

### `seasons`

A competition season (e.g. `2026/2027`). Supports multiple seasons; MVP seeds one current Premier League season.

| Column           | Type          | Null | Notes                                  |
| ---------------- | ------------- | ---- | -------------------------------------- |
| `id`             | `UUID`        | no   | PK                                     |
| `competition_id` | `UUID`        | no   | FK → `competitions.id`                 |
| `name`           | `TEXT`        | no   | Human label, e.g. `2026/2027`          |
| `start_date`     | `DATE`        | no   | Inclusive season start (calendar date) |
| `end_date`       | `DATE`        | no   | Inclusive season end                   |
| `is_current`     | `BOOLEAN`     | no   | Default `false`                        |
| `created_at`     | `TIMESTAMPTZ` | no   | Default `now()`                        |
| `updated_at`     | `TIMESTAMPTZ` | no   | Default `now()`                        |

**Constraints / indexes**

- `FOREIGN KEY (competition_id) REFERENCES competitions(id)`
- `UNIQUE (competition_id, name)`
- `UNIQUE (id, competition_id)` to support fixture/season competition integrity
- `CHECK (end_date >= start_date)`
- Partial unique index: at most one `is_current = true` per competition  
  `UNIQUE (competition_id) WHERE is_current`

### `teams`

Club identity used by fixtures and events. No player/lineup data in this phase.

| Column       | Type          | Null | Notes                                              |
| ------------ | ------------- | ---- | -------------------------------------------------- |
| `id`         | `UUID`        | no   | PK                                                 |
| `name`       | `TEXT`        | no   | Full club name                                     |
| `short_name` | `TEXT`        | yes  | Shorter UI label                                   |
| `tla`        | `TEXT`        | yes  | Three-letter abbreviation                          |
| `crest_url`  | `TEXT`        | yes  | HTTPS club crest URL from the active data provider |
| `created_at` | `TIMESTAMPTZ` | no   | Default `now()`                                    |
| `updated_at` | `TIMESTAMPTZ` | no   | Default `now()`                                    |

**Constraints / indexes**

- No global unique on `name` (names can collide across competitions/providers over time; uniqueness comes from provider mappings and application upsert rules)
- Optional `CHECK (tla IS NULL OR char_length(tla) = 3)`
- Optional `CHECK (crest_url IS NULL OR crest_url starts with 'https://')`

### `fixtures`

A scheduled or played match. Always references competition, season, home team, and away team.

| Column           | Type          | Null | Notes                                                    |
| ---------------- | ------------- | ---- | -------------------------------------------------------- |
| `id`             | `UUID`        | no   | PK                                                       |
| `competition_id` | `UUID`        | no   | FK → `competitions.id`                                   |
| `season_id`      | `UUID`        | no   | FK → `seasons.id`                                        |
| `home_team_id`   | `UUID`        | no   | FK → `teams.id`                                          |
| `away_team_id`   | `UUID`        | no   | FK → `teams.id`                                          |
| `status`         | `TEXT`        | no   | See status enum below                                    |
| `kickoff_at`     | `TIMESTAMPTZ` | no   | Scheduled kickoff (UTC)                                  |
| `matchday`       | `INT`         | yes  | Gameweek / matchday when known                           |
| `home_score`     | `INT`         | yes  | Set when available; required conceptually when completed |
| `away_score`     | `INT`         | yes  | Same as `home_score`                                     |
| `venue`          | `TEXT`        | yes  | Optional venue label                                     |
| `created_at`     | `TIMESTAMPTZ` | no   | Default `now()`                                          |
| `updated_at`     | `TIMESTAMPTZ` | no   | Default `now()`                                          |

**Fixture status values**

| Status      | Meaning                               |
| ----------- | ------------------------------------- |
| `scheduled` | Future or not-yet-started match       |
| `live`      | In progress                           |
| `postponed` | Delayed; kickoff may be updated later |
| `cancelled` | Will not be played                    |
| `completed` | Finished with a final score           |

Stored as `TEXT` with a check constraint (not a Postgres `ENUM`) so new statuses can be added via migration without `ALTER TYPE` friction.

**Constraints / indexes**

- FKs for `competition_id`, `season_id`, `home_team_id`, `away_team_id`
- Composite FK `(season_id, competition_id) → seasons(id, competition_id)`
- `CHECK (home_team_id <> away_team_id)`
- `CHECK (status IN ('scheduled', 'live', 'postponed', 'cancelled', 'completed'))`
- `CHECK (home_score IS NULL OR home_score >= 0)`
- `CHECK (away_score IS NULL OR away_score >= 0)`
- `CHECK (status <> 'completed' OR (home_score IS NOT NULL AND away_score IS NOT NULL))`
- Index `(season_id, kickoff_at)`
- Index `(status)`
- Index `(home_team_id)`
- Index `(away_team_id)`
- Index `(competition_id, season_id)`

The composite season/competition foreign key prevents a fixture from pairing a season with the wrong competition.

### `match_events`

Timeline / incident log for a fixture. Supports goals, cards, substitutions, period changes, and provider corrections without requiring every subtype to be fully modeled yet.

| Column                | Type          | Null | Notes                                               |
| --------------------- | ------------- | ---- | --------------------------------------------------- |
| `id`                  | `UUID`        | no   | PK                                                  |
| `fixture_id`          | `UUID`        | no   | FK → `fixtures.id` ON DELETE CASCADE                |
| `event_type`          | `TEXT`        | no   | See event types below                               |
| `minute`              | `INT`         | yes  | Clock minute when known                             |
| `extra_minute`        | `INT`         | yes  | Stoppage-time minute                                |
| `period`              | `TEXT`        | yes  | e.g. `1H`, `2H`, `ET`, `PEN`                        |
| `team_id`             | `UUID`        | yes  | FK → `teams.id`; side associated with the event     |
| `player_name`         | `TEXT`        | yes  | Display name only (no `players` table yet)          |
| `related_player_name` | `TEXT`        | yes  | Assist / player replaced / etc.                     |
| `detail`              | `JSONB`       | yes  | Extensible payload (card color, score state, notes) |
| `sort_key`            | `INT`         | no   | Ordering within a fixture when timestamps collide   |
| `occurred_at`         | `TIMESTAMPTZ` | yes  | Provider/event time when known                      |
| `created_at`          | `TIMESTAMPTZ` | no   | Default `now()`                                     |
| `updated_at`          | `TIMESTAMPTZ` | no   | Default `now()`                                     |

**Event types (initial allowed set)**

| `event_type`          | Intent                                     |
| --------------------- | ------------------------------------------ |
| `goal`                | Goal scored                                |
| `card`                | Yellow / red / second yellow (detail JSON) |
| `substitution`        | Player on/off                              |
| `period_change`       | Kickoff, HT, FT, ET boundaries             |
| `provider_correction` | Correction / void emitted by a provider    |

Stored as `TEXT` + `CHECK` for the same migration-friendliness reason as fixture status.

**Constraints / indexes**

- `FOREIGN KEY (fixture_id) REFERENCES fixtures(id) ON DELETE CASCADE`
- `FOREIGN KEY (team_id) REFERENCES teams(id)`
- `CHECK (event_type IN ('goal', 'card', 'substitution', 'period_change', 'provider_correction'))`
- `CHECK (minute IS NULL OR minute >= 0)`
- `CHECK (extra_minute IS NULL OR extra_minute >= 0)`
- Index `(fixture_id, sort_key)`
- Index `(fixture_id, event_type)`

Player identity is intentionally a free-text name until a later `players` table exists. Corrections are modeled as first-class events rather than destructive updates to prior rows; consumers should treat `provider_correction` as a signal to reinterpret earlier events.

### `player_snapshot_runs`

An immutable, successfully completed import of the current draft-player pool. A run belongs to one season and records when the external source was captured. Failed imports are not published as runs, so product reads can safely select the most recent row.

| Column        | Type          | Null | Notes                                  |
| ------------- | ------------- | ---- | -------------------------------------- |
| `id`          | `UUID`        | no   | PK                                     |
| `season_id`   | `UUID`        | no   | FK → `seasons.id`                      |
| `provider`    | `TEXT`        | no   | Provider key; initially `fpl`          |
| `captured_at` | `TIMESTAMPTZ` | no   | Time the provider payload was captured |
| `created_at`  | `TIMESTAMPTZ` | no   | Default `now()`                        |

**Constraints / indexes**

- `UNIQUE (season_id, provider, captured_at)`
- Index `(season_id, captured_at DESC)`

### `player_snapshot_entries`

The curated draft pool within a snapshot. Entries deliberately do not distinguish starters from bench players: every selected player has equal draft status. Ingestion publishes exactly 18 entries per participating club and assigns `club_rank` only to make selection deterministic and auditable.

| Column               | Type          | Null | Notes                                            |
| -------------------- | ------------- | ---- | ------------------------------------------------ |
| `snapshot_id`        | `UUID`        | no   | FK → `player_snapshot_runs.id` ON DELETE CASCADE |
| `team_id`            | `UUID`        | no   | FK → `teams.id`                                  |
| `provider_player_id` | `TEXT`        | no   | Stable player ID within the snapshot provider    |
| `first_name`         | `TEXT`        | no   | Display data captured with the snapshot          |
| `last_name`          | `TEXT`        | no   | Display data captured with the snapshot          |
| `display_name`       | `TEXT`        | no   | Short UI name                                    |
| `position`           | `TEXT`        | no   | `GK`, `DEF`, `MID`, or `FWD`                     |
| `nationality_code`   | `TEXT`        | yes  | FPL region code; null when the provider omits it |
| `photo_url`          | `TEXT`        | yes  | Captured Premier League headshot URL             |
| `club_rank`          | `SMALLINT`    | no   | Deterministic rank from 1 through 18             |
| `global_rank`        | `SMALLINT`    | yes  | Global rank; null only on legacy snapshots       |
| `created_at`         | `TIMESTAMPTZ` | no   | Default `now()`                                  |

**Constraints / indexes**

- Primary key `(snapshot_id, provider_player_id)`
- `UNIQUE (snapshot_id, team_id, club_rank)`
- `CHECK (position IN ('GK', 'DEF', 'MID', 'FWD'))`
- `CHECK (nationality_code IS NULL OR nationality_code ~ '^[A-Z0-9]{2}$')`
- `CHECK (club_rank BETWEEN 1 AND 18)`
- `CHECK (global_rank > 0)`
- `UNIQUE (snapshot_id, global_rank)`
- Index `(snapshot_id, team_id)`

The database enforces rank bounds and uniqueness. The ingestion service validates the stronger cross-row invariant of exactly 18 players for every participating club before opening a transaction.

### `provider_references`

Maps one PremSight entity to an external provider’s ID. Enables multi-provider ingestion without coupling internal PKs to any vendor.

| Column               | Type          | Null | Notes                                                             |
| -------------------- | ------------- | ---- | ----------------------------------------------------------------- |
| `id`                 | `UUID`        | no   | PK                                                                |
| `provider`           | `TEXT`        | no   | Provider key, e.g. `football-data`                                |
| `entity_type`        | `TEXT`        | no   | `competition` \| `season` \| `team` \| `fixture` \| `match_event` |
| `entity_id`          | `UUID`        | no   | Internal PremSight ID (polymorphic)                               |
| `provider_entity_id` | `TEXT`        | no   | ID as issued by the provider                                      |
| `created_at`         | `TIMESTAMPTZ` | no   | Default `now()`                                                   |
| `updated_at`         | `TIMESTAMPTZ` | no   | Default `now()`                                                   |

**Constraints / indexes**

- `CHECK (entity_type IN ('competition', 'season', 'team', 'fixture', 'match_event'))`
- `UNIQUE (provider, entity_type, provider_entity_id)` — same provider ID cannot map twice
- `UNIQUE (provider, entity_type, entity_id)` — one internal entity has at most one ID per provider
- Index `(entity_type, entity_id)` for reverse lookups

`entity_id` is polymorphic (no single FK). Referential integrity to the concrete table is enforced in repository/application code and tests in this phase. A later ADR may split this into per-entity mapping tables if stronger DB-level FKs are required.

## Deferred entities

Explicitly out of scope until later phases:

| Entity     | Reason                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------ |
| Player     | Canonical identity/career model remains deferred; draft snapshots are intentionally denormalized |
| Lineup     | Depends on Player                                                                                |
| User       | Auth phase                                                                                       |
| Favorite   | Personalization phase                                                                            |
| Prediction | Prediction engine phase                                                                          |
| TeamRating | Prediction engine phase                                                                          |
| Standing   | Historical/standings phase after fixtures                                                        |

## Seed data

Minimum seed (idempotent):

1. Competition: Premier League (`code = 'PL'`)
2. Current season row for that competition (`is_current = true`), named for the active PL season at seed time
3. Optional small set of example teams only if useful for local demos; tests should insert their own teams/fixtures

Seeds must not invent provider-specific IDs unless accompanying `provider_references` rows are also seeded for a named test provider.

## Migration rules

1. Update this document → then author migration SQL
2. Migrations are paired files: `NNNN_name.up.sql` / `NNNN_name.down.sql` under `packages/database/migrations/`
3. Apply with `uv run premsight-db up` (see `packages/database/README.md`); versions are recorded in `schema_migrations`
4. Every migration must have a safe down/rollback path (`premsight-db down`)
5. Prefer additive migrations; document breaking changes explicitly
6. Use `UUID` primary keys generated by the database (`gen_random_uuid()` via `pgcrypto`) or by the application before insert
7. Prefer `TEXT` + `CHECK` over Postgres `ENUM` for evolving vocabularies

## Testing expectations (schema milestone)

Automated tests must prove:

- Migrations apply on an empty database
- Migrations roll back safely
- Seed creates Premier League + current season
- Teams and fixtures can be inserted and queried
- Duplicate provider mappings are rejected
- A fixture cannot reference the same team as home and away
- A fixture cannot reference a season from another competition
- A completed fixture must have both scores
- Documented check/unique constraints hold

## Decisions

1. **Migration runner:** plain SQL + Python `premsight-db` CLI (not Alembic)
2. **UUID generation:** database default via `pgcrypto.gen_random_uuid()` (UUID v4)
3. **Provider mapping:** single polymorphic `provider_references` table
4. **Match events:** mutable rows allowed; `provider_correction` is a first-class event type for vendor fixes
5. **Draft players:** immutable, denormalized snapshots retain only 18 equally draftable players per club; they are not canonical player records and carry no starter/bench role

## Remaining ADR candidates

- Split polymorphic `provider_references` into per-entity mapping tables if stronger FKs are needed
- Adopt UUID v7 later for time-sortable IDs
- Introduce Alembic only if/when SQLAlchemy becomes the API data layer

## References

- [packages/database/README.md](../packages/database/README.md)
- [API Spec](./04-api-spec.md)
- [Data Ingestion](./05-data-ingestion.md)
- [Roadmap](./02-roadmap.md)
