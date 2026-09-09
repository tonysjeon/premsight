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

## Team roster review

Player favorites are stored per account in `player_favorites`. Authenticated
`GET /v1/favorites/players`, `PUT /v1/favorites/players/{uuid}`, and
`DELETE /v1/favorites/players/{uuid}` list, save, and remove them. Saves are
idempotent; deleting an account cascades to its favorites.
Team follows use the equivalent GET, PUT and DELETE routes at
`/v1/favorites/teams` and are stored in `team_favorites`, with the same
account isolation and deletion behavior.

Apply database migrations to the API's configured `DATABASE_URL` before running
new endpoints. Compose permits this URL to point at a remote database; migrating
localhost Postgres does not update that remote schema. Favorites require
migrations 0015 (players) and 0016 (teams).

The 2026/27 Premier League roster responses exclude existing players absent from their
club's FotMob squad page in the September 8, 2026 review. The reviewed exclusions and
source URLs for all 20 clubs live in `app/data/roster_exclusions.json`. Matching uses
existing player slugs and team codes, including manually reviewed name variants.
Historical seasons, other clubs, player search, and stored memberships are unaffected.
This is a dated review, not a live sync: refresh the file after roster changes. New
players are not automatically excluded merely because they were absent from this review.

`app/data/roster_facts.json` contains the matching September 8 FotMob shirt numbers,
full birth dates, and displayed heights for 491 existing roster players. The API
validates these fields, computes ages using the current UTC date, and includes
`date_of_birth`, `age`, and `height_inches` in reviewed roster responses. Heights
retain FotMob's displayed inch precision; unknown heights/numbers remain null.
The snapshot is limited to the reviewed season and does not overwrite player identities.
Reviewed rosters follow FotMob's saved squad table order (`roster_order`); players
without a reviewed order appear afterward in their original order.
The position lists were reviewed against FotMob's squad tables on September 9,
2026 for all 491 players. Reviewed roster and favorite responses preserve the
provider's position order and labels (including DM and AM), except LM/RM are
displayed as LW/RW with duplicates removed. Stored membership
positions and the Compare/Draft position taxonomy are unchanged.
