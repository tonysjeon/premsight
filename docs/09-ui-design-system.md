# UI Design System

## Direction

PremSight uses a restrained matchday editorial style: deep navy surfaces, warm off-white content, vivid green status accents, compact score typography, and generous whitespace. The interface should feel analytical without resembling a generic administration dashboard.

## Tokens

- Background: `#07111f`
- Surface: `#0e1c2f`
- Paper: `#f4f1e8`
- Text on dark: `#f8fafc`
- Muted: `#9baabd`
- Accent: `#45e07a`
- Border: translucent white or navy at low contrast
- Radius: 16–24px for cards; pills only for statuses

## Typography

Use the bundled Geist family. Headlines are tight and confident; scores use the mono face. Body copy remains at least 16px with comfortable line height.

## Components

- Match rows always show both teams, status/kickoff, and score when available.
- Table rows use tabular numerals and retain column headers for accessibility.
- Status labels communicate with text as well as color.
- Links and controls have a visible `:focus-visible` outline.
- Empty and error states explain what is unavailable and preserve navigation.

## Responsive behavior

The layout is mobile-first. Cards stack below 768px; secondary league-table columns may be hidden on narrow screens while position, team, played, goal difference, and points remain visible.
