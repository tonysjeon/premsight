# UI Design System

## Direction

PremSight presents a dense matchday product surface with the restraint of a modern football application. A charcoal canvas, slightly raised dark surfaces, high-contrast type, compact rows, and tabular numerals make scanning many matches and table positions the primary job; decoration is secondary.

## Tokens

Defined as custom properties in `apps/web/src/app/globals.css`.

| Token              | Value     | Use                                                |
| ------------------ | --------- | -------------------------------------------------- |
| `--ink`            | `#101110` | Page canvas                                        |
| `--surface`        | `#1b1c1b` | Card background                                    |
| `--surface-hover`  | `#242624` | Row hover                                          |
| `--surface-sunken` | `#252625` | Stat tiles and inset table headers                 |
| `--chip`           | `#343534` | Idle filter chips, fixture day bars, pager buttons |
| `--chip-hover`     | `#404140` | Filter chip hover                                  |
| `--chip-ink`       | `#f4f4f4` | Text on idle chips and matching bars               |
| `--line`           | `#303230` | Card and row borders                               |
| `--text`           | `#f3f4f2` | Primary text                                       |
| `--muted`          | `#a1a5a1` | Secondary text and column headers                  |
| `--accent`         | `#4fd18b` | Brand, selected state, points, wins                |
| `--live`           | `#f05c72` | Live status                                        |
| `--zone-ucl`       | `#4385e0` | Champions League positions                         |
| `--zone-uel`       | `#d58a31` | Europa League position                             |
| `--zone-drop`      | `#e25757` | Relegation positions, losses                       |

Radii are 20px for cards and 11px for nested tiles. Matchday filters use compact pills, while statuses retain smaller labels.

## Typography

The UI uses the locally bundled Manrope variable font, with the system sans stack as a loading fallback. Its geometric shapes and open counters give the interface a softer identity without sacrificing dense-table legibility. No webfont is fetched at request time. Headlines are tight (`-0.03em`) and modest in size; text across the application uses a consistent `700` bold weight for clear scanning. Scores, points, and every table figure use `font-variant-numeric: tabular-nums` so columns align.

## Components

- **Card** — titled container with optional note and a single action link. `flush` mode removes padding so rows and tables meet the card edge.
- **Team badge** — the normalized FotMob crest when mapped, then the ingestion-provider crest, with a coloured monogram as the final fallback. The explicit crest map covers clubs in the available seasons so compact badges use a consistent, current set without per-club scaling. Club fallback colours and crest overrides remain presentation-only in `apps/web/src/lib/teams.ts`.
- **Match row** — status on the left, both teams stacked in the middle with their goals, chevron on the right. The losing side is muted so results read at a glance.
- **Compact fixture row** — centred home and away names with crests and the score or kickoff time, with muted `FT` text under a completed score and `Live` under a live score. Team names use the same weight as weekday and period headers. By Round uses a slightly shorter card under a weekday header. By Team uses the same card with the weekday date in the top-left. Historical seasons include the calendar year on those dates.
- **Matchday chips** — horizontally scrollable links that set the selected matchday. The active chip carries `aria-current`.
- **Season picker** — compact custom dropdown in the shared header. Its trigger shows only the selected season, and its menu marks the active season while preserving keyboard focus and dismissal behavior.
- **League table** — position, badge, team, and figures, with a qualification zone bar and a legend explaining the zone colours. The home overview and full-width Table page share the same visual treatment: the team identity receives most of the row, fixed-width metrics align on the right, the visible Team heading is omitted, and combined goals for/against appear alongside the next opponent crest on the current season. Historical seasons omit Next.
- **Form guide** — last five results as W/D/L marks packed from the left. The Form heading is centred on the first mark. The column grows with available results rather than reserving five slots. Exposed to assistive technology as a text label.
- **Stat tile** — a single figure with an uppercase label.
- **Match hub** — a single chrome card: toolbar with a circular Back control, Premier League lion tinted to the caption colour, and `Premier League Matchday n` for the current season (`Premier League Round n, 2022/23` for historical seasons); hero with date/venue facts (calendar and soccer-pitch icons; the date includes the year only when it is not the visitor's current calendar year) and a three-column team/time board; left-aligned tab row attached to the bottom of that card (Preview, Table, Head-to-Head). Board crests use the `lg` badge size and sit toward the centre beside bold team names matching the fixture cards. The Table tab reuses the overview league-table treatment; rows for the two clubs in the open fixture use a raised highlight. Preview uses club-coloured probability count pills labelled Win / Draw / Win, a thin outcome bar, and a two-column Team form of recent league scorelines. Head-to-Head uses club-coloured count pills, a Home filter chip with a centred `Dating back to 2021/22` coverage note on the same row, and dated meeting rows with crests and scores.

## Colour and meaning

Colour never carries meaning alone. Status is written out (`FT`, `Live`, kickoff time), qualification zones are explained by the legend, and the form guide provides a spoken label alongside the coloured marks.

## Motion

Motion is limited to 120ms colour transitions on hover and focus, and only inside a `prefers-reduced-motion: no-preference` query. There are no entrance, loading, or value animations.

## Responsive behavior

The layout is mobile-first and never scrolls sideways.

- Above 1000px the home page is a table-first overview with a sticky matchday rail.
- At 1000px and below the matchday rail moves beneath the table and stops sticking.
- At 620px and below secondary table columns (`W`, `D`, `L`, `GF`, `GA`) are hidden while position, team, played, goal difference, points, and form remain.
- Tables sit in a horizontally scrollable wrapper, so a wide table scrolls inside its card instead of widening the page.

## Accessibility

Links and controls show a visible `:focus-visible` outline. Team badges are `aria-hidden` because the adjacent name is the label. Match rows carry a descriptive `aria-label`. Abbreviated column headers use `<abbr title>`. Empty and error states explain what is unavailable and preserve navigation.
