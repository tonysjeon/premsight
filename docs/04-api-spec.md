# API Spec

## Purpose

Define the public HTTP surface of PremSight services, starting with health and expanding to domain resources as they are approved.

## Overview

Primary product API: `services/api` (default local port `8000`).  
Prediction engine: `services/prediction-engine` (port `8001`).  
Ingestion: `services/ingestion` (port `8002`, not in Compose yet).

Contracts should eventually be reflected in OpenAPI and `packages/shared-types`.

## Current endpoints

### API (`services/api`)

| Method | Path      | Description                                                |
| ------ | --------- | ---------------------------------------------------------- |
| `GET`  | `/health` | Liveness; `{ "status": "ok", "service": "premsight-api" }` |

### Prediction engine

| Method | Path      | Description                                                              |
| ------ | --------- | ------------------------------------------------------------------------ |
| `GET`  | `/health` | Liveness; `{ "status": "ok", "service": "premsight-prediction-engine" }` |

### Ingestion

| Method | Path      | Description                                                      |
| ------ | --------- | ---------------------------------------------------------------- |
| `GET`  | `/health` | Liveness; `{ "status": "ok", "service": "premsight-ingestion" }` |

## Phase 4 read API

All product resources are versioned under `/v1`.

| Method | Path                           | Purpose                                      |
| ------ | ------------------------------ | -------------------------------------------- |
| `GET`  | `/v1/seasons/current`          | Current Premier League season                |
| `GET`  | `/v1/teams`                    | Teams with optional `season_id` filter       |
| `GET`  | `/v1/teams/{id}`               | Team details and fixtures                    |
| `GET`  | `/v1/fixtures`                 | Fixtures filtered by season, status, or team |
| `GET`  | `/v1/fixtures/{id}`            | Match detail                                 |
| `GET`  | `/v1/fixtures/{id}/prediction` | Versioned pre-match probabilities            |
| `GET`  | `/v1/standings?season_id={id}` | Table computed from completed fixtures       |

List responses use `{ "items": [...], "count": n }`. Missing resources return `404` with FastAPI's standard `detail` field. Invalid UUIDs or query values return `422`.

## Future resource areas

Domain HTTP handlers are **out of scope for the core data model milestone**. The schema in [Database Schema](./03-database-schema.md) shapes these future read APIs:

| Area          | Likely future resources                                              |
| ------------- | -------------------------------------------------------------------- |
| Competitions  | `GET /competitions`, `GET /competitions/{id}`                        |
| Seasons       | `GET /competitions/{id}/seasons`, `GET /seasons/{id}`                |
| Teams         | `GET /teams`, `GET /teams/{id}`                                      |
| Fixtures      | `GET /fixtures` (filter by season/status/date), `GET /fixtures/{id}` |
| Match events  | `GET /fixtures/{id}/events`                                          |
| Standings     | Deferred until standings tables exist                                |
| Probabilities | Proxied/composed via prediction-engine after prediction tables exist |

### API implications of the schema milestone

- Public IDs will be PremSight internal UUIDs, never raw provider IDs.
- Fixture payloads should include `competition_id`, `season_id`, `home_team_id`, `away_team_id`, `status`, `kickoff_at` (UTC ISO-8601), and nullable scores.
- Fixture `status` values exposed by the API must match the database vocabulary: `scheduled`, `live`, `postponed`, `cancelled`, `completed`.
- Match event `event_type` values: `goal`, `card`, `substitution`, `period_change`, `provider_correction`.
- `provider_references` are an ingestion/internal concern and should not be exposed on public product endpoints in v1.
- Player fields on events, if returned before a `players` table exists, remain display strings (`player_name`, `related_player_name`), not player resource links.

## Goals

- Consistent JSON error and health shapes
- Versioning strategy decided before public clients depend on paths
- Shared TS types for web responses

## Non-goals

- GraphQL in v1
- Embedding prediction math in API handlers
- Implementing domain routes in the core data model milestone

## Conventions (draft)

- JSON request/response bodies
- UTC timestamps in ISO-8601
- Explicit `service` field on health payloads
- Resource IDs are UUIDs

## Open questions

- URL versioning (`/v1/...`) vs header versioning
- Auth model for write vs read paths
- WebSocket vs SSE for live updates

## References

- [System Architecture](./01-system-architecture.md)
- [Database Schema](./03-database-schema.md)
- [Frontend Spec](./08-frontend-spec.md)
