# PremSight API

FastAPI HTTP API for PremSight health, fixtures, teams, seasons, standings, and sign-in.

## Run locally

```bash
cd services/api
uv sync
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Health

`GET /health` → `{ "status": "ok", "service": "premsight-api" }`

Auth (`/v1/auth/*`) uses Google OAuth, stores the account in `users` / `oauth_identities`, and sets an httpOnly `premsight_session` cookie. `DELETE /v1/auth/me` removes the account. Set `AUTH_SECRET` (required in production) plus the Google OAuth variables in `.env.example`.

## Tests

```bash
uv run pytest
```
