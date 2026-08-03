# Frontend Spec

## Phase 4 scope

The web application provides five server-rendered product surfaces:

- `/` — current-season overview, next fixtures, recent results, and leading table positions
- `/fixtures` — season fixture list grouped by date
- `/matches/{id}` — fixture identity, kickoff/status, and score
- `/teams/{id}` — team details with recent and upcoming fixtures
- `/table` — full current-season league table

## Data boundary

Server components read the main API through `NEXT_PUBLIC_API_URL`. UI components contain presentation logic only. API failures produce a clear unavailable state; empty datasets produce intentional empty states. Provider IDs are never rendered or used in routes.

## Navigation and layout

Every page shares a header with Home, Fixtures, and Table navigation. Content uses a centered responsive container, readable maximum widths, visible keyboard focus, and semantic tables/lists. Mobile layouts preserve scores and team names without horizontal page scrolling.

## Rendering

- Pages use the App Router and server components by default.
- Dynamic route `params` are awaited as required by Next.js 16.
- Product reads use request-time fetching so newly ingested fixtures are visible without rebuilding.
- Dates are formatted in UTC for deterministic server output in Phase 4.

## Non-goals

- Authentication and favorites
- Live polling, WebSockets, or animations
- Prediction probabilities
- Client-side filtering beyond normal links

## References

- [API Spec](./04-api-spec.md)
- [UI Design System](./09-ui-design-system.md)
- [Roadmap](./02-roadmap.md)
