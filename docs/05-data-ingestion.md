# Data Ingestion

## Purpose

Describe how external football data will enter PremSight, and what the ingestion service owns versus the API.

## Overview

`services/ingestion` will pull (or receive) Premier League data from one or more providers and persist normalized records to PostgreSQL. Provider SDKs and schedules are **not implemented** yet—only service structure and `/health` exist.

The API should read persisted data; it should not scrape providers directly.

## Goals

- Isolate provider credentials, rate limits, and mapping logic in ingestion
- Idempotent upserts into schema-approved tables
- Observable jobs (logs/metrics) for sync and live feeds

## Non-goals

- Calling providers from `apps/web` or `prediction-engine`
- Defining the final vendor before product/cost review

## Planned responsibilities

| Concern                    | Owner             |
| -------------------------- | ----------------- |
| Provider auth & HTTP       | ingestion         |
| Normalize → DB             | ingestion         |
| Serve product reads        | api               |
| Model inputs from DB / API | prediction-engine |

## Feed types (planned)

- Schedule / fixtures sync
- Standings sync
- Live match events (polling or webhook—TBD)

## Open questions

- Provider selection and licensing
- Polling interval vs webhooks for live data
- Backfill strategy for historical seasons

## References

- [System Architecture](./01-system-architecture.md)
- [Database Schema](./03-database-schema.md)
- [services/ingestion/README.md](../services/ingestion/README.md)
