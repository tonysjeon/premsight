# Frontend Spec

## Phase 4 scope

The web application provides six product surfaces:

- `/` — table-first season overview with the selected matchday alongside it
- `/fixtures` — upcoming fixtures and matchday browser for a selected season
- `/matches/{id}` — fixture identity, kickoff/status, and score
- `/teams/{id}` — team details with recent and upcoming fixtures
- `/table` — full current-season league table
- `/draft` — interactive Draft XI simulator backed by PremSight's latest stored player snapshot

## Home page composition

The home page defaults to the season marked current by the API. A shared header selector lists available Premier League seasons; changing seasons clears any selected matchday. The full league table is the primary content column. The selected matchday sits in a narrower right column for quick context, following the information hierarchy of established football score applications. Previous and next controls step through matchdays, while the matchday title opens a compact selector for direct navigation. The compact header does not repeat the date window or link to the full fixtures view.

The Fixtures page presents the same compact matchday card used beside the home overview at the full shared-header width. A pill header switches between By Matchday and By Team. Both modes use a compact dropdown above day-grouped, centred fixture rows; team options use the fixture-row display names in alphabetical order. Team-filtered schedules show one roughly two-month block at a time, labelled with its first and last fixture dates, with previous/next period controls below the rows. Its controls use `/fixtures?season={id}&matchday={n}` for matchdays and `/fixtures?season={id}&view=team&team={id}&period={n}` for teams. Missing or invalid view, matchday, team, and period values resolve to deterministic defaults.

The full Table page exposes All, Home, and Away pills. Home and Away recalculate every displayed statistic and rank from completed fixtures at that venue only. The filter uses `/table?season={id}&venue={home|away}`; missing or invalid venue values resolve to All.

The Draft page is a separate, non-season-scoped product surface linked from the primary header. It follows a FIFA-style 23-player draft. A seeded draft session opens on a tall empty pitch with a centered formation-selection overlay. The overlay places five formations sampled from the supported catalog in a vertical list on the left and a large preview of the highlighted formation on the right. Formation diagrams tighten lines containing only two or three players. After confirming the highlighted formation, the user chooses one captain from five players sampled from the 15 highest-priced retained FPL players. Captain cards show position, nationality flag, club badge, and the provider headshot without repeating the club name. The captain occupies the first compatible starting slot using either a primary or secondary role, or the first substitute slot when no starting role is valid.

The user then fills each remaining starting slot on a tall pitch. Starter, substitute, and reserve cards use the same aspect ratio, silhouette, metadata stack, cropped headshot, and bottom name treatment used by the Choose a Player cards; empty slots retain the corresponding blank-card treatment. Each formation assigns a detailed role such as `LB`, `CB`, `CAM`, or `RW` to every starter slot. Clicking an empty starter draws five seeded-random, undrafted players whose stored compatible-position list contains that role; broad `DEF`, `MID`, or `FWD` values remain valid fallbacks for players that could not be enriched confidently. Every draw opens in the same card-selection overlay used for captain selection and must be completed; the user cannot dismiss an active draw. The active draw is a modal full-viewport focus layer with a centered selection panel, and the underlying pitch and squad cards are inert to pointer and keyboard input. A press-and-hold View squad control in the panel's top-right temporarily hides both the panel and focus tint, restoring them immediately on release without cancelling or unlocking the draw. Seven substitute slots and five reserve slots follow; their offers may contain any position. Picks are permanent within a draft: an occupied card never reopens its player draw. A selected player can move by click-to-swap or desktop drag-and-drop only when both players are compatible with their destination starter roles; two bench or reserve players must share at least one compatible position. Empty cards are not swap destinations. The complete squad therefore contains 11 starters, 7 substitutes, and 5 reserves.

The server loads the latest complete PremSight snapshot, containing 16 undifferentiated players per club with exactly one goalkeeper. The browser does not call the upstream provider. A missing snapshot produces an explanatory empty state rather than preventing the rest of PremSight from rendering.

`season` and `matchday` are untrusted input. A season is accepted only when its ID appears in the API season list. A matchday is accepted only when it matches `^\d{1,2}$` and names a matchday that exists in the selected season. Invalid values fall back to the current season or its default matchday rather than erroring.

The default matchday is the next round that still has unplayed fixtures, or the most recently completed round once the season is over. Matchday chips retain the selected season. An "Up next" card renders only on the fixtures page and only when scheduled fixtures exist, so a completed season shows no empty placeholder.

## Data boundary

Server components read the main API through `NEXT_PUBLIC_API_URL`. Pages that render teams also read `/v1/teams` to resolve display names and abbreviations; short names and three-letter abbreviations are API data, never derived in the UI when the API provides them.

Derivations that the API does not expose — grouping by day, recent form, matchday selection, and season aggregates — live in pure modules under `src/lib` (`season.ts`, `teams.ts`), not in components. UI components contain presentation logic only.

API failures produce a clear unavailable state; empty datasets produce intentional empty states. Provider IDs are never rendered or used in routes.

## Navigation and layout

Every page shares a sticky brand bar with the PremSight logo and a dedicated Draft button. Season-scoped pages add a second header card containing Overview, Table, Fixtures, and the season selector; the standalone Draft page omits that season navigation. Navigation among the three season-scoped surfaces preserves the selected season, while Draft remains independent of season selection. Changing seasons from a match or team surface returns to the overview because those routes are not season-scoped. Content uses a centered responsive container, readable maximum widths, visible keyboard focus, and semantic tables/lists. Mobile layouts preserve scores and team names without horizontal page scrolling; wide tables scroll within their card.

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
