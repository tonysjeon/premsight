# Deployment

## Purpose

Describe how PremSight processes run locally and which work is still deferred to later environments.

## Overview

Local full-stack startup uses the root `docker-compose.yml`. Compose runs PostgreSQL, Redis, the product API, the prediction engine, the web app, and the ingestion service. Container database URLs always use the Compose hostname `postgres`, not a host-machine `DATABASE_URL`.

## Local Compose

The ingestion container starts the fixture refresh scheduler when `FOOTBALL_DATA_API_TOKEN` is set. That job replays the current Premier League season on a fixed interval using the same sync path as the CLI. Run a single ingestion replica so provider rate limits are not doubled.

Set the token in the root `.env` used by Compose. An empty token leaves `/health` up and skips the scheduler.

Schema migrations are not applied by Compose. Apply `premsight-db` against the Compose Postgres instance before the first successful sync on a new database.

## Goals

- Keep provider credentials in environment variables
- Keep scheduled provider calls inside the ingestion service

## Non-goals

- Kubernetes manifests
- Multi-replica scheduling or distributed locks
- Production secret management

## References

- [Data Ingestion](./05-data-ingestion.md)
- Root `docker-compose.yml`
