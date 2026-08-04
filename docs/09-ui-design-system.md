# UI Design System

## Direction

PremSight presents a dense matchday product surface with the restraint of a modern football application. A charcoal canvas, slightly raised dark surfaces, high-contrast type, compact rows, and tabular numerals make scanning many matches and table positions the primary job; decoration is secondary.

## Tokens

Defined as custom properties in `apps/web/src/app/globals.css`.

| Token              | Value     | Use                                 |
| ------------------ | --------- | ----------------------------------- |
| `--ink`            | `#101110` | Page canvas                         |
| `--surface`        | `#1b1c1b` | Card background                     |
| `--surface-hover`  | `#242624` | Row hover                           |
| `--surface-sunken` | `#252625` | Day headers, chips, stat tiles      |
| `--line`           | `#303230` | Card and row borders                |
| `--text`           | `#f3f4f2` | Primary text                        |
| `--muted`          | `#a1a5a1` | Secondary text and column headers   |
| `--accent`         | `#4fd18b` | Brand, selected state, points, wins |
| `--live`           | `#f05c72` | Live status                         |
| `--zone-ucl`       | `#4385e0` | Champions League positions          |
| `--zone-uel`       | `#d58a31` | Europa League position              |
| `--zone-drop`      | `#e25757` | Relegation positions, losses        |

Radii are 16px for cards and 11px for nested tiles. Matchday filters use compact pills, while statuses retain smaller labels.

## Typography

The UI uses the platform rounded system stack—SF Pro Rounded on supported Apple devices—with variable Segoe and standard system fallbacks. No webfont is fetched at build or request time. Headlines are tight (`-0.03em`) and modest in size; the interface leans on weight and density rather than scale. Scores, points, and every table figure use `font-variant-numeric: tabular-nums` so columns align.

## Components

- **Card** — titled container with optional note and a single action link. `flush` mode removes padding so rows and tables meet the card edge.
- **Team badge** — the provider crest when available, with a coloured monogram fallback. Club fallback colours remain presentation-only in `apps/web/src/lib/teams.ts`.
- **Match row** — status on the left, both teams stacked in the middle with their goals, chevron on the right. The losing side is muted so results read at a glance.
- **Matchday chips** — horizontally scrollable links that set the selected matchday. The active chip carries `aria-current`.
- **League table** — position, badge, team, and figures, with a qualification zone bar, optional form guide, and a legend explaining the zone colours. The home overview gives the team identity most of the row, aligns fixed-width metrics on the right, omits the visible Team heading, and adds combined goals for/against plus the next opponent crest.
- **Form guide** — last five results as W/D/L marks, exposed to assistive technology as a text label.
- **Stat tile** — a single figure with an uppercase label.

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
