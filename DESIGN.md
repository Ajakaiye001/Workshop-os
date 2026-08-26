# WorkshopOS design system

Tokens live in `src/index.css`. Tailwind maps them in `tailwind.config.js`.
Never hardcode a colour in a component; use a token.

## Colour

Strategy: **Restrained** in the product (tinted neutrals, one accent under 10%
of surface), **Committed** on the marketing site (the accent carries the page).

All colour is OKLCH. Neutrals are tinted toward hue 260 (cool graphite) at very
low chroma, so nothing is pure black or pure white.

### Accent: hi-vis

`--hv: oklch(0.865 0.196 118)` — the yellow-green of workshop safety wear. It is
the brand mark, the focus ring, the live/active state, the primary series in
charts, and the drench on the marketing hero. Deliberately not the SaaS-indigo
reflex, and not automotive red/black.

Because it is a light colour, **text never sits on hi-vis unless it is
`--hv-ink`** (a deep lime-tinted graphite). Hi-vis is a fill, not a text colour,
except on dark backgrounds.

### Surfaces

`--paper` (page) → `--surface` → `--raised` (panels, the highest layer) with
`--sunken` for insets and `--panel` for the sidebar. `--line` and `--line-strong`
are the only two border weights.

### Semantics

`ok` / `warn` / `bad` / `info` / `purple`, each with a `-bg` companion for chips
and callouts. Amber means "blocked or waiting", red means "wrong", green means
"done", purple means "in a process" (diagnosing, quality check, reserved).

### Alpha

Tailwind's `/opacity` modifier does **not** work on colours defined as bare
`var(--x)`. Use the explicit tokens `--hv-40`, `--hv-30`, `--hv-12` instead, e.g.
`ring-[var(--hv-30)]`.

## Theme

Three surfaces, three deliberate choices:

- **Admin and customer portal: light.** A service advisor at a reception desk in
  a glass-fronted workshop at 8:30am, sunlight through the roller door, reading a
  24-inch monitor. Light wins under that ambient light. A dark toggle exists in
  the top bar for late shifts.
- **Technician app: always dark.** A tablet held at an angle under overhead
  fluorescents, in a greasy hand. A big white field throws glare; dark also
  signals "you are on the floor, not in the office". Forced in `App.tsx`, not
  user-toggleable.
- **Diagnostics console: dark inside the light page.** The scan tool is an
  instrument. It is rendered with `data-theme="dark"` on its own wrapper so it
  reads as a piece of equipment embedded in the page.
- **Marketing: dark, drenched.** Its own visual world.

## Typography

- **Product UI: Inter.** One family carries headings, labels, body and data.
  Fixed rem scale, ratio ~1.15, no fluid clamps.
- **Identifiers: JetBrains Mono.** Fault codes, VINs, registrations, part
  numbers, bin locations, job numbers, PO numbers, times. Mono is earned here —
  these are read character by character.
- **Money and counts:** `.num` applies `font-variant-numeric: tabular-nums`.
- **Marketing: Archivo**, using its width axis. `.mkt-display` sets `wdth: 112`,
  weight 700, tracking −0.035em, leading 0.92. `.mkt-eyebrow` is JetBrains Mono,
  uppercase, 0.18em tracking.

## Spacing and layout

4px base. Panels use 12px (dense) or 16px padding; page gutters 16/24px.
Content columns cap at 1300–1500px depending on table width. Prose caps at
65–75ch; tables run wider.

Two layout invariants, both learned the hard way:

- **Any box with a fixed pixel height must set `whitespace-nowrap`.** `Reg`,
  `Badge`, `StatusBadge` and the `Segmented` options are all fixed-height pills;
  if their text wraps, the second line renders outside the border. They are
  atomic tokens — the neighbours in the row are what truncate, never the token.
  A row containing one needs `min-w-0` so its flexible sibling can shrink.
- **Implicit grid tracks are `auto`, which sizes to max-content.** Below the
  breakpoint where a layout declares `grid-template-columns`, a wide table
  inside would push the whole page sideways instead of scrolling in its own
  `overflow-x-auto` wrapper. `src/index.css` sets
  `.grid { grid-auto-columns: minmax(0, 1fr) }` so every implicit track can
  shrink; explicit templates at any breakpoint still win.

Both are covered by the audit scripts described in the repo notes: one walks
every route at six widths looking for content taller than its fixed-height box,
the other asserts no page scrolls horizontally.

## Components

`src/components/ui/index.tsx` is the whole kit: Button (6 variants × 4 sizes),
IconButton, Badge, Dot, Panel, MetricStrip/Metric, Table primitives, Field,
Input, Select, Textarea, Checkbox, Switch, Segmented, Tabs, Modal, Drawer,
Popover, MenuItem, Callout, EmptyState, Skeleton, Toaster, Confirm, Avatar,
Meter, KV, Kbd, Sparkline.

Domain display components live in `src/components/Bits.tsx`: StatusBadge,
PriorityTag, StockBadge, POStatusBadge, InvoiceStatusBadge, SeverityBadge, Reg,
VehicleCell, Money, FuelGauge.

Notes:

- **Metric strips are an instrument cluster, not a row of cards.** One bordered
  container, hairline `gap-px` dividers, uppercase micro-label, tabular number,
  delta and sparkline. No gradients, no icons in circles.
- **The registration plate** (`<Reg>`) is a real component: mono, uppercase,
  blue EU strip on the left. It is how workshop people identify a car.
- Every interactive component ships default, hover, focus-visible, active,
  disabled and (where relevant) loading and error states.
- Cards are used when a card is genuinely the affordance (bays, tier cards).
  Lists and tables carry most of the density.

## Motion

150–250ms, `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out-quart) or ease-out-expo
for entrances. Motion conveys state only: the diagnostic scan sweep, the pulse
on a live job, drawer and toast entrances, meter fills. No page-load
choreography in the product. The marketing site gets scroll reveals.
`prefers-reduced-motion` collapses everything to 0.01ms.

## Charts

Hand-rolled SVG in `src/components/charts`, no dependency. Series palette starts
with hi-vis then moves through muted analytic hues at consistent lightness.
Grid lines are `--line`. Tooltips are bordered panels, never dark bubbles.

## Accessibility

Focus-visible is a 2px hi-vis ring at 2px offset (darkened to
`oklch(0.62 0.15 120)` on light surfaces for contrast). Icon-only buttons carry
`aria-label` and `title`. Status is never colour alone — every badge has a word.
