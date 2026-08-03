# UI Design System

## Direction

PremSight presents a dense matchday product surface with the restraint of an independent football publication. Warm paper, white match sheets, charcoal type, compact rows, and tabular numerals make scanning many matches and table positions the primary job; decoration is secondary.

## Tokens

Defined as custom properties in `apps/web/src/app/globals.css`.

| Token              | Value     | Use                                 |
| ------------------ | --------- | ----------------------------------- |
| `--ink`            | `#f1efe9` | Page canvas                         |
| `--surface`        | `#fffefb` | Card background                     |
| `--surface-hover`  | `#f7f5ef` | Row hover                           |
| `--surface-sunken` | `#e9e6de` | Day headers, chips, stat tiles      |
| `--line`           | `#d9d5cb` | Card and row borders                |
| `--text`           | `#18201d` | Primary text                        |
| `--muted`          | `#66706b` | Secondary text and column headers   |
| `--accent`         | `#176b45` | Brand, selected state, points, wins |
| `--live`           | `#ba3046` | Live status                         |
| `--zone-ucl`       | `#315da8` | Champions League positions          |
| `--zone-uel`       | `#b66b16` | Europa League position              |
| `--zone-drop`      | `#b83a3a` | Relegation positions, losses        |

Radii are 16px for cards and 11px for nested tiles. Matchday filters use compact pills, while statuses retain smaller labels.

## Typography

The UI uses the platform rounded system stack—SF Pro Rounded on supported Apple devices—with variable Segoe and standard system fallbacks. No webfont is fetched at build or request time. Headlines are tight (`-0.03em`) and modest in size; the interface leans on weight and density rather than scale. Scores, points, and every table figure use `font-variant-numeric: tabular-nums` so columns align.

## Components

- **Card** — titled container with optional note and a single action link. `flush` mode removes padding so rows and tables meet the card edge.
- **Team badge** — the provider crest when available, with a coloured monogram fallback. Club fallback colours remain presentation-only in `apps/web/src/lib/teams.ts`.
- **Match row** — status on the left, both teams stacked in the middle with their goals, chevron on the right. The losing side is muted so results read at a glance.
- **Matchday chips** — horizontally scrollable links that set the selected matchday. The active chip carries `aria-current`.
- **League table** — position, badge, team, and figures, with a qualification zone bar, optional form guide, and a legend explaining the zone colours.
- **Form guide** — last five results as W/D/L marks, exposed to assistive technology as a text label.
- **Stat tile** — a single figure with an uppercase label.

## Colour and meaning

Colour never carries meaning alone. Status is written out (`FT`, `Live`, kickoff time), qualification zones are explained by the legend, and the form guide provides a spoken label alongside the coloured marks.

## Motion

Motion is limited to 120ms colour transitions on hover and focus, and only inside a `prefers-reduced-motion: no-preference` query. There are no entrance, loading, or value animations.

## Responsive behavior

The layout is mobile-first and never scrolls sideways.

- Above 1000px the home page is a match feed with a sticky table and stats rail.
- At 1000px and below the rail moves beneath the feed and stops sticking.
- At 620px and below secondary table columns (`W`, `D`, `L`, `GF`, `GA`) are hidden while position, team, played, goal difference, points, and form remain.
- Tables sit in a horizontally scrollable wrapper, so a wide table scrolls inside its card instead of widening the page.

## Accessibility

Links and controls show a visible `:focus-visible` outline. Team badges are `aria-hidden` because the adjacent name is the label. Match rows carry a descriptive `aria-label`. Abbreviated column headers use `<abbr title>`. Empty and error states explain what is unavailable and preserve navigation.
