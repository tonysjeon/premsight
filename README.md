# PremSight

Premier League–focused live football application. Monorepo bootstrap only — product features are not implemented yet.

## Overview

PremSight will eventually provide fixtures, live matches, standings, team pages, live events, and real-time probability updates powered by a Poisson prediction engine. This repository currently establishes a scalable architecture and local development environment.

## Architecture

```text
┌─────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  apps/web   │────▶│  services/api    │────▶│  PostgreSQL / Redis │
│  (Next.js)  │     │  (FastAPI)       │     └─────────────────────┘
└─────────────┘     └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────────┐
                    │ prediction-engine    │
                    │ (FastAPI + NumPy…)   │
                    └──────────────────────┘

                    ┌──────────────────────┐
                    │ ingestion (structure)│
                    │ provider integration │
                    │ deferred             │
                    └──────────────────────┘
```

Services stay loosely coupled. Prediction logic lives only in `services/prediction-engine`.

## Tech stack

| Layer             | Stack                                                            |
| ----------------- | ---------------------------------------------------------------- |
| Frontend          | Next.js (App Router), TypeScript, Tailwind CSS, ESLint, Prettier |
| API               | Python 3.12, FastAPI, uv                                         |
| Prediction engine | FastAPI, NumPy, pandas, SciPy                                    |
| Ingestion         | FastAPI (structure only)                                         |
| Data              | PostgreSQL 16, Redis 7                                           |
| Tooling           | pnpm workspaces, Docker Compose, GitHub Actions                  |

## Repository structure

```text
premsight/
├── apps/web/                  # Next.js frontend
├── services/
│   ├── api/                   # Primary HTTP API
│   ├── prediction-engine/     # Isolated prediction service
│   └── ingestion/             # Future data ingestion
├── packages/
│   ├── shared-types/          # Shared TypeScript contracts
│   └── database/              # SQL migrations (placeholder)
├── docs/                      # Product & engineering docs
├── infrastructure/            # Future IaC
├── .github/workflows/         # CI
├── .cursor/                   # Cursor engineering rules
├── docker-compose.yml
└── README.md
```

## Prerequisites

- Node.js 22+
- [pnpm](https://pnpm.io/) 11+
- [uv](https://docs.astral.sh/uv/) (Python tooling)
- Docker & Docker Compose (for full stack)

## Setup

### 1. Clone and configure environment

```bash
cp .env.example .env
```

### 2. Start with Docker Compose

```bash
docker compose up --build
```

| Service                  | URL                          |
| ------------------------ | ---------------------------- |
| Web                      | http://localhost:3000        |
| API health               | http://localhost:8000/health |
| Prediction engine health | http://localhost:8001/health |
| PostgreSQL               | localhost:5432               |
| Redis                    | localhost:6379               |

Ingestion is scaffolded under `services/ingestion` but is not part of Compose yet.

### 3. Native development (optional)

**Frontend**

```bash
pnpm install
pnpm dev:web
```

**API**

```bash
cd services/api && uv sync
uv run uvicorn app.main:app --reload --port 8000
```

**Prediction engine**

```bash
cd services/prediction-engine && uv sync
uv run uvicorn app.main:app --reload --port 8001
```

**Ingestion**

```bash
cd services/ingestion && uv sync
uv run uvicorn app.main:app --reload --port 8002
```

## Quality checks

```bash
# Frontend
pnpm lint
pnpm typecheck
pnpm test
pnpm format:check

# Backend (per service)
cd services/api && uv run ruff check . && uv run pytest
```

CI runs these on every push and pull request (see `.github/workflows/ci.yml`).

## Documentation

Starter docs live in [`docs/`](./docs/). Begin with product vision and system architecture, then expand API, schema, and model specs before implementing domain features.

Engineering principles for contributors: [`.cursor/rules.md`](./.cursor/rules.md).

## Roadmap summary

1. **Bootstrap** (current) — monorepo, health endpoints, Docker, CI, docs stubs
2. **Data foundation** — schema, migrations, ingestion providers
3. **Core API** — fixtures, standings, teams
4. **Live layer** — match events, real-time updates
5. **Predictions** — Poisson engine, probability APIs
6. **Product UI** — match hub, team pages, live experience

## License

MIT — see [LICENSE](./LICENSE).
