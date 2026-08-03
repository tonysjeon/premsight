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

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness; `{ "status": "ok", "service": "premsight-api" }` |

### Prediction engine

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness; `{ "status": "ok", "service": "premsight-prediction-engine" }` |

### Ingestion

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness; `{ "status": "ok", "service": "premsight-ingestion" }` |

## Planned resource areas (not implemented)

- Fixtures / matches
- Live match state and events
- Standings
- Teams
- Probabilities (proxied or composed via prediction-engine)

## Goals

- Consistent JSON error and health shapes
- Versioning strategy decided before public clients depend on paths
- Shared TS types for web responses

## Non-goals

- GraphQL in v1
- Embedding prediction math in API handlers

## Conventions (draft)

- JSON request/response bodies
- UTC timestamps in ISO-8601
- Explicit `service` field on health payloads

## Open questions

- URL versioning (`/v1/...`) vs header versioning
- Auth model for write vs read paths
- WebSocket vs SSE for live updates

## References

- [System Architecture](./01-system-architecture.md)
- [Database Schema](./03-database-schema.md)
- [Frontend Spec](./08-frontend-spec.md)
