# Frontend Spec

## Phase 4 scope

The web application provides five server-rendered product surfaces:

- `/` — matchday feed for the current season, with a league table and season summary rail
- `/fixtures` — season fixture list grouped by date
- `/matches/{id}` — fixture identity, kickoff/status, and score
- `/teams/{id}` — team details with recent and upcoming fixtures
- `/table` — full current-season league table

## Home page composition

The home page leads with the matchday a visitor most likely wants: the next matchday that still has unplayed fixtures, or the most recently completed one once the season is over. Matchday chips link to `/?matchday=N`.

`matchday` is untrusted input. It is accepted only when it matches `^\d{1,2}$` and names a matchday that exists in the season; anything else falls back to the default matchday rather than erroring.

The rail shows the leading table positions with qualification zones and form, plus season aggregates (matches played, goals, goals per game, share of home wins, biggest win). An "Up next" card renders only when scheduled fixtures exist, so a completed season shows no empty placeholder.

## Data boundary

Server components read the main API through `NEXT_PUBLIC_API_URL`. Pages that render teams also read `/v1/teams` to resolve display names and abbreviations; short names and three-letter abbreviations are API data, never derived in the UI when the API provides them.

Derivations that the API does not expose — grouping by day, recent form, matchday selection, and season aggregates — live in pure modules under `src/lib` (`season.ts`, `teams.ts`), not in components. UI components contain presentation logic only.

API failures produce a clear unavailable state; empty datasets produce intentional empty states. Provider IDs are never rendered or used in routes.

## Navigation and layout

Every page shares a sticky header with Matches, Fixtures, and Table navigation. Content uses a centered responsive container, readable maximum widths, visible keyboard focus, and semantic tables/lists. Mobile layouts preserve scores and team names without horizontal page scrolling; wide tables scroll within their card.

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
