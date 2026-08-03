# Database Schema

## Purpose

Define how PremSight persists Premier League data in PostgreSQL and how migrations are managed—before any football tables are created.

## Overview

Schema lives under `packages/database`. Today only a placeholder migration exists (`schema_meta`). Football entities are **planned, not implemented**.

Migrations should be reviewed against this document before merge.

## Goals

- Single source of truth in PostgreSQL for teams, fixtures/matches, standings, events, and prediction snapshots
- Ordered, reviewable migrations under `packages/database/migrations/`
- Explicit naming and nullability rules once tables are introduced

## Non-goals (current phase)

- Creating teams/fixtures/standings/events tables yet
- Choosing a final ORM (SQLAlchemy/Alembic wiring deferred until first real migration)
- Denormalized analytics warehouses

## Planned entities (names TBD)

| Area | Intent |
|------|--------|
| Teams | Club identity and display metadata |
| Fixtures / matches | Scheduled and live match records |
| Standings | League table snapshots |
| Live events | Goals, cards, substitutions, etc. |
| Prediction snapshots | Model outputs keyed to match + time |

Exact columns, keys, and indexes will be specified here before the first domain migration.

## Migration rules

1. Update this doc → then author SQL (or Alembic revision once adopted)
2. No football tables in bootstrap / placeholder migrations
3. Prefer additive migrations; document breaking changes explicitly

## Open questions

- UUID vs serial primary keys
- How to version standings and prediction snapshots historically
- Soft-delete vs immutable event log for live events

## References

- [packages/database/README.md](../packages/database/README.md)
- [API Spec](./04-api-spec.md)
- [Data Ingestion](./05-data-ingestion.md)
