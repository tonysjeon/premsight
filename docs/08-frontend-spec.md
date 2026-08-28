# Frontend Spec

## Phase 4 scope

The web application provides six product surfaces:

- `/` — table-first season overview with the selected matchday alongside it
- `/fixtures` — upcoming fixtures and matchday browser for a selected season
- `/matches/{id}` — match hub: identity, kickoff/status/score, model prediction, season table, and head-to-head
- `/teams/{id}` — team details with recent and upcoming fixtures
- `/table` — full current-season league table
- `/draft` — interactive Draft XI simulator backed by PremSight's latest stored player snapshot

## Home page composition

The home page defaults to the season marked current by the API. A shared header selector lists available Premier League seasons; changing seasons clears any selected matchday. The full league table is the primary content column. The selected matchday sits in a narrower right column for quick context, following the information hierarchy of established football score applications. Previous and next controls step through matchdays, while the matchday title opens a compact selector for direct navigation. The compact header does not repeat the date window or link to the full fixtures view. Historical seasons omit the table's Next opponent column.

The Fixtures page presents the same compact matchday card used beside the home overview at the full shared-header width. A pill header switches between By Round and By Team. Both modes use a compact dropdown above the same centred fixture cards: team names and crests around the score or kickoff time, with `FT` as plain text under a completed score and `Live` under a live score. By Round groups those cards under sunken weekday headers and uses a slightly shorter card height. Historical seasons append the compact year to the round label (`Round 12, 2022/23`) and to weekday dates (`Friday, August 12, 2022`). By Team shows one roughly two-month block at a time, with the weekday date in the top-left of each card and previous/next period controls below the rows. Its controls use `/fixtures?season={id}&matchday={n}` for rounds and `/fixtures?season={id}&view=team&team={id}&period={n}` for teams. Missing or invalid view, matchday, team, and period values resolve to deterministic defaults.

The full Table page exposes All, Home, and Away pills. Home and Away recalculate every displayed statistic and rank from completed fixtures at that venue only. The filter uses `/table?season={id}&venue={home|away}`; missing or invalid venue values resolve to All. Form marks pack from the left and the column grows with available results, up to five; the Form heading is centred on the first mark. Historical seasons omit the Next opponent column.

The Draft page is a separate, non-season-scoped product surface linked from the primary header. It follows a FIFA-style 23-player draft. A seeded draft session opens on a tall empty pitch with a centered formation-selection overlay. The overlay places five formations sampled from the supported catalog in a vertical list on the left and a large preview of the highlighted formation on the right. Formation diagrams tighten lines containing only two or three players. After confirming the highlighted formation, the user chooses one captain from five players sampled from the 15 highest-rated retained players. Captain cards show rating, position, nationality flag, and club badge without a profile picture or repeated club name. The captain occupies the first compatible starting slot using either a primary or secondary role, or the first substitute slot when no starting role is valid.

The user then fills each remaining starting slot on a tall pitch. Starter, substitute, and reserve cards use the same aspect ratio, metadata stack, and bottom name treatment used by the Choose a Player cards; empty slots retain the corresponding blank-card treatment. Each formation assigns a detailed role such as `LB`, `CB`, `CAM`, or `RW` to every starter slot. Clicking an empty starter draws five seeded-random, undrafted players whose stored compatible-position list contains that role. Every draw opens in the same card-selection overlay used for captain selection and must be completed; the user cannot dismiss an active draw. The active draw is a modal full-viewport focus layer with a centered selection panel, and the underlying pitch and squad cards are inert to pointer and keyboard input. A press-and-hold View squad control in the panel's top-right temporarily hides both the panel and focus tint, restoring them immediately on release without cancelling or unlocking the draw. Seven substitute slots and five reserve slots follow; their offers may contain any position. Picks are permanent within a draft: an occupied card never reopens its player draw. A selected player can move by click-to-swap or desktop drag-and-drop only when every destination starting-XI role is compatible with its incoming player. Swaps entirely within substitutes and reserves have no position restriction. Empty cards are not swap destinations. The complete squad therefore contains 11 starters, 7 substitutes, and 5 reserves.

The server loads the latest complete PremSight snapshot, containing one EA-rating-optimized projected starting XI per club. Player cards display the `ea-fc-v1` overall rating. Ratings of 75 or higher use the gold card treatment; lower ratings use silver. The browser does not call either upstream provider. A missing snapshot produces an explanatory empty state rather than preventing the rest of PremSight from rendering.

Once all 23 squad slots are filled, the Draft page opens a modal with the deterministic projected league result and points total. The model computes separate mean EA ratings for the 11 starters and seven substitutes, combines them with 85% starter weight and 15% substitute weight, and maps the weighted rating linearly to a projected total from 0 to 100 league points. The five reserves have no effect on the score. Results are classified as Centurions (exactly 100 points), Champions (90–99), 2nd Place (84–89), 3rd Place (78–83), 4th Place (72–77), Mid Table (52–71), Survive Relegation (36–51), or Relegation (0–35). The modal does not expose model internals. It closes from its X control or a click on the backdrop and offers a Start New Draft action that clears the squad and begins a freshly seeded formation flow. After dismissal, a compact outcome-and-points control remains in the pitch's bottom-right corner and reopens the modal when selected.

`season` and `matchday` are untrusted input. A season is accepted only when its ID appears in the API season list. A matchday is accepted only when it matches `^\d{1,2}$` and names a matchday that exists in the selected season. Invalid values fall back to the current season or its default matchday rather than erroring.

The default matchday is the next round that still has unplayed fixtures, or the most recently completed round once the season is over. Matchday chips retain the selected season. An "Up next" card renders only on the fixtures page and only when scheduled fixtures exist, so a completed season shows no empty placeholder.

## Match hub

`/matches/{id}` is a dedicated match surface. It keeps the site brand bar and omits the Overview / Table / Fixtures season card so the match chrome can occupy that space.

The match chrome is a single card with three stacked blocks:

1. **Toolbar** — a circular back control and Back label (underlines on hover) that returns to the previous in-app page (Overview, Table, Fixtures, or a team page), and the Premier League lion (same colour and size as the caption) to the left of `Premier League Matchday n`. Historical seasons use `Premier League Round n, 2022/23` instead, because the match hub omits the season selector. There is no follow or broadcast control. Match-hub tab changes replace the current history entry so Back leaves the match rather than undoing a tab.
2. **Hero** — local kickoff date and optional venue as fact chips (calendar and soccer-pitch icons), then a centred board: home name hugging its crest, kickoff time or score, away crest hugging its name. Crests sit a tight, equal gap from the centre. Kickoff facts include the calendar year only when the match is not in the visitor's current year (`Sat, August 29, 6:30 PM` this year; `Sat, January 16, 2027, 3:00 PM` next year; `Sat, August 13, 2022, 3:00 PM` in a past year). For a scheduled fixture the centre shows local kickoff time and a relative day label (`Today`, `Tomorrow`, `2 days`). For a live or completed fixture it shows the score and status (`Live`, `Full time`).
3. **Tabs** — Preview (for upcoming fixtures in the current matchday/week only), Table, and Head-to-Head sit on the bottom edge of the same card, with no divider above them. The selected tab is a server-rendered query (`/matches/{id}?tab=preview|table|h2h`). For active upcoming fixtures in the current week, missing or invalid tab parameters fall back to Preview; for completed fixtures or matches beyond the current week, the Preview tab is omitted and defaults to Table. The active tab uses accent colour and an underline.

**Preview** is the pre-match prediction panel for current-week upcoming fixtures (omitted once a fixture is completed or for future matchdays beyond the active week). It opens with the win/draw probability summary matching the Head-to-Head layout (team crests, club-coloured percentage pills labelled Win / Draw / Win, a thin segmented outcome bar), then a two-column Team form of each club's most recent league results this season (coloured score pills, with a centred underline under the latest result). When the prediction service cannot produce an estimate, the same panel explains why instead of hiding the tab, and still shows Team form when results exist.

**Table** uses the same overview league table as `/table` (played, W/D/L, combined goals, last five results, goal difference, points, and next opponent) and highlights the two participating teams. Historical seasons omit Next.

**Head-to-Head** opens with a wins/draws/wins summary: each club's crest sits beside a count pill in that club's colours, with Draws in a neutral grey pill. The Home chip toggles home-only meetings with an animated collapse/expand on non-home fixtures and synchronizes the URL query (`/matches/{id}?tab=h2h` and `&h2h=home`). The list shows prior completed meetings, newest first, with local date, crests, score, and competition mark. The open fixture is excluded until it is completed. A centred note on the Home chip row states coverage from the earliest stored season (`Dating back to 2021/22`).

Broadcast listings, follow/favorites, and predicted lineups are out of scope.

## Data boundary

Server components read the main API through `NEXT_PUBLIC_API_URL`. Pages that render teams also read `/v1/teams` to resolve display names and abbreviations; short names and three-letter abbreviations are API data, never derived in the UI when the API provides them.

Derivations that the API does not expose — grouping by day, recent form, matchday selection, season aggregates, match-hub tabs, head-to-head scope, countdown labels, head-to-head records, and visitor-timezone clocks — live in pure modules under `src/lib` (`season.ts`, `teams.ts`, `match.ts`, `time.ts`), not in components. UI components contain presentation logic only.

API failures produce a clear unavailable state; empty datasets produce intentional empty states. Provider IDs are never rendered or used in routes.

## Navigation and layout

Every page shares a sticky brand bar with the PremSight logo and a dedicated Draft button. Season-scoped pages add a second header card containing Overview, Table, Fixtures, and the season selector. The Draft page and match hub omit that season navigation. Navigation among the three season-scoped surfaces preserves the selected season, while Draft remains independent of season selection. Changing seasons from a match or team surface returns to the overview because those routes are not season-scoped. Content uses a centered responsive container, readable maximum widths, visible keyboard focus, and semantic tables/lists. Mobile layouts preserve scores and team names without horizontal page scrolling; wide tables scroll within their card.

## Rendering

- Pages use the App Router and server components by default.
- Dynamic route `params` and `searchParams` are awaited as required by Next.js 16.
- Product reads use request-time fetching so newly ingested fixtures are visible without rebuilding.
- Kickoff instants stay UTC in the API. Fixture-card clocks and weekday labels format in the visitor's timezone with `Intl` (`America/Los_Angeles`, and so on). The browser already knows that zone; PremSight does not store or track it. Round grouping still uses the UTC calendar day so server HTML stays stable.

## Non-goals

- Authentication and favorites
- Live polling, WebSockets, or value/entrance animations (hover and focus transitions only)
- Predicted lineups, broadcast listings, or follow controls on the match hub
- Client-side filtering; matchday and match-hub tab selection are server-rendered links, not client state

## References

- [API Spec](./04-api-spec.md)
- [UI Design System](./09-ui-design-system.md)
- [Roadmap](./02-roadmap.md)
