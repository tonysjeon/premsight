# Frontend Spec

## Phase 4 scope

The web application provides five server-rendered product surfaces:

- `/` — table-first season overview with the selected matchday alongside it
- `/fixtures` — upcoming fixtures and matchday browser for a selected season
- `/matches/{id}` — fixture identity, kickoff/status, and score
- `/teams/{id}` — team details with recent and upcoming fixtures
- `/table` — full current-season league table

## Home page composition

The home page defaults to the season marked current by the API. A shared header selector lists available Premier League seasons; changing seasons clears any selected matchday. The full league table is the primary content column. The selected matchday sits in a narrower right column for quick context, following the information hierarchy of established football score applications. Previous and next controls step through matchdays, while the matchday title opens a compact selector for direct navigation. The compact header does not repeat the date window or link to the full fixtures view.

The fixtures page owns the deeper schedule experience. It leads with the next scheduled matches, followed by a matchday browser with two-column fixture rows on wide screens. Its season and matchday controls use `/fixtures?season={id}&matchday={n}`.

`season` and `matchday` are untrusted input. A season is accepted only when its ID appears in the API season list. A matchday is accepted only when it matches `^\d{1,2}$` and names a matchday that exists in the selected season. Invalid values fall back to the current season or its default matchday rather than erroring.

The default matchday is the next round that still has unplayed fixtures, or the most recently completed round once the season is over. Matchday chips retain the selected season. An "Up next" card renders only on the fixtures page and only when scheduled fixtures exist, so a completed season shows no empty placeholder.

## Data boundary

Server components read the main API through `NEXT_PUBLIC_API_URL`. Pages that render teams also read `/v1/teams` to resolve display names and abbreviations; short names and three-letter abbreviations are API data, never derived in the UI when the API provides them.

Derivations that the API does not expose — grouping by day, recent form, matchday selection, and season aggregates — live in pure modules under `src/lib` (`season.ts`, `teams.ts`), not in components. UI components contain presentation logic only.

API failures produce a clear unavailable state; empty datasets produce intentional empty states. Provider IDs are never rendered or used in routes.

## Navigation and layout

Every page shares a sticky header with Matches, Fixtures, and Table navigation plus the season selector. Navigation among those three surfaces preserves the selected season. Changing seasons from a match or team detail returns to the overview because those routes are not season-scoped. Content uses a centered responsive container, readable maximum widths, visible keyboard focus, and semantic tables/lists. Mobile layouts preserve scores and team names without horizontal page scrolling; wide tables scroll within their card.

## Rendering

- Pages use the App Router and server components by default.
- Dynamic route `params` and `searchParams` are awaited as required by Next.js 16.
- Product reads use request-time fetching so newly ingested fixtures are visible without rebuilding.
- Dates are formatted in UTC for deterministic server output in Phase 4.

## Non-goals

- Authentication and favorites
- Live polling, WebSockets, or value/entrance animations (hover and focus transitions only)
- Prediction probabilities
- Client-side filtering; matchday selection is a server-rendered link, not client state

## References

- [API Spec](./04-api-spec.md)
- [UI Design System](./09-ui-design-system.md)
- [Roadmap](./02-roadmap.md)
