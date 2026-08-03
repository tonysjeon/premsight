# PremSight Database Package

SQL migrations and schema documentation for PremSight's PostgreSQL database.

## Status

Bootstrap only. **No football-specific tables** are defined yet.

## Future tables (planned, not implemented)

When product and API specs land, expect entities such as:

- Teams
- Fixtures / matches
- Standings
- Live events
- Prediction snapshots

Exact names, columns, and relationships will be specified in `docs/03-database-schema.md` before any migration is authored.

## Migrations

Place ordered SQL (or Alembic revisions, once wired) under `migrations/`.

The placeholder migration establishes a `schema_meta` marker only so the folder is usable in CI and local tooling.

## Local connection

See root `.env.example` and `packages/database/.env.example` for `DATABASE_URL`.
