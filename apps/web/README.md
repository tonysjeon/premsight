# PremSight Web

Next.js (App Router) frontend for PremSight.

## Development

From the monorepo root:

```bash
pnpm install
pnpm dev:web
```

Or via Docker Compose (see root README).

## Environment

Root `.env.example` documents local Compose variables. For native Next.js, set `NEXT_PUBLIC_API_URL` (and `INTERNAL_API_URL` if the server must not use localhost).

## Vercel

This package is the only Vercel target. The FastAPI API, prediction engine, ingestion, and Postgres stay off Vercel.

1. Import the GitHub repository in Vercel.
2. Set **Root Directory** to `apps/web` (framework: Next.js, Node 22).
3. Environment variables:
   - `INTERNAL_API_URL` — origin the serverless render uses (same public API URL unless you have private networking)
   - `NEXT_PUBLIC_API_URL` — public API origin (no trailing slash)
4. On the API host, include the Vercel deployment origin in `API_CORS_ORIGINS`.

`vercel.json` skips a build when the commit does not touch this app, shared-types, or workspace lockfiles.
