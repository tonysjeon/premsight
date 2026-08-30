# PremSight Database Package

SQL migrations and schema documentation for PremSight's PostgreSQL database.

## Status

Phase 2 core football data model implemented.

The package owns ordered, reversible SQL migrations, idempotent seed data, and PostgreSQL integration tests for:

- competitions and seasons
- teams and fixtures
- match events
- external provider references
- users and oauth_identities (Google site accounts)

Standings are derived in the API, not stored. Player catalog tables and `users` (site accounts) are included. Prediction outputs are not persisted.

## Migrations

Migrations are paired `NNNN_name.up.sql` and `NNNN_name.down.sql` files under `migrations/`. Applied versions are recorded in `schema_migrations`.

```bash
uv sync --all-groups
uv run premsight-db up
uv run premsight-db seed
uv run premsight-db status
uv run premsight-db down
```

Run integration tests only against a disposable database. The test fixtures reject database names that do not end in `_test` because they rebuild the schema:

```bash
docker compose exec postgres createdb -U premsight premsight_test
DATABASE_URL=postgresql://premsight:premsight@localhost:5433/premsight_test \
  uv run pytest
```

## Local connection

See root `.env.example` and `packages/database/.env.example` for `DATABASE_URL`.
