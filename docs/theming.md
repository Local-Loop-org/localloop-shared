# Theming — Design System & Light/Dark

> Source of truth for color/type/spacing/radius is the mobile theme module
> [`localloop-mobile/src/shared/theme/index.ts`](../../localloop-mobile/src/shared/theme/index.ts).
> Values are lifted from the Claude Design handoff bundle ("LocalLoop — Design
> System", v1.0, 26 May 2026). When this doc and the code disagree, the code wins.

## Status: Phase 1 + Phase 2 shipped ✅

The design system, theming **infrastructure**, and the full render-time
migration are all in place. The live in-place Light/Dark toggle now repaints
**every** screen instantly.

- **Phase 1 (done):** both palettes with exact design values, the radius scale,
  the two fonts (Space Grotesk + JetBrains Mono), the theme store, `useTheme()` /
  `useThemedStyles()` hooks, navigation theme + StatusBar following the mode, and
  the Profile Light/Dark toggle persisting the preference.
- **Phase 2 (done):** every `StyleSheet.create` site reads the active palette at
  render time (recipe below). The backward-compat `colors`/`typography` dark
  singletons were **removed** from `theme/index.ts` — a clean `tsc` proves no file
  reads the static palette. 71 jest suites / 564 tests green.

### Why two phases — the technical constraint

React Native's `StyleSheet.create()` resolves color values **once, at module
load**, and bakes them in. So updating a centralized palette cannot repaint an
already-rendered screen — a style must be created at **render time** from the
active palette. Phase 1 wired that machinery (`useTheme()` / `useThemedStyles()`)
on a few surfaces; Phase 2 was the mechanical migration of every remaining
`StyleSheet.create` site so the whole app re-styles on toggle. Dark remains the
design's default ("light is parity, not the default").

## Palettes

Both palettes expose identical keys (enforced by `lightColors: ThemeColors`).
Existing app token names are kept (design tokens mapped onto them), so consumers
read them straight off `useTheme().colors`.

| `colors.*` key | Design token | Dark | Light |
|---|---|---|---|
| `primary` | accent | `#00D9FF` | `#0084B8` |
| `secondary` / `accent2` | accent-2 | `#B06CFF` | `#7A3CFF` |
| `accentInk` | accent-ink | `#070710` | `#FFFFFF` |
| `background` | bg | `#0A0A0D` | `#F5F5FA` |
| `surface` | surface | `#15151B` | `#FFFFFF` |
| `surface2` | surface-2 | `#1F1F27` | `#EDEDF5` |
| `text` | text | `#FAFAFF` | `#0A0A0D` |
| `textSecondary` / `dim` | dim | `rgba(250,250,255,0.60)` | `rgba(10,10,13,0.60)` |
| `faint` | faint | `rgba(250,250,255,0.35)` | `rgba(10,10,13,0.35)` |
| `line` | line | `rgba(255,255,255,0.07)` | `rgba(10,10,15,0.08)` |
| `lineStrong` *(new)* | line-strong | `rgba(255,255,255,0.14)` | `rgba(10,10,15,0.16)` |
| `error` | danger | `#FF5B6B` | `#D8303F` |
| `success` | live | `#33E07C` | `#0EAD50` |
| `warning` | *(app-only)* | `#F0A24A` | `#B5701A` |

Plus semantic alpha tokens for de-inlining the prototypes' inline `rgba(...)`:
`duotoneSoftFrom`/`duotoneSoftTo`, `anchorTileBorder`, `primarySoft`/
`primarySoft08`/`primaryBorder`, `dangerSoft`/`dangerBorder`, `scrim`,
`quotedReplyBg`, `switchTrackOff` (Switch/segmented "off" track), and
`surfaceOverlay` (translucent surface chrome floating over previews/media, e.g.
the group radius-preview distance badge) — the latter two added in Phase 2. A
few one-off translucent fills are kept as `` `${c.token}AA` ``
template literals at render (e.g. the green "live" badge, the accent-2 DM-request
banner) rather than minted as new tokens.

## Scales, fonts, governance

- `radius`: `xs 6 · sm 8 · md 12 · lg 14 · xl 16 · xxl 22 · pill 999`.
- `spacing`: 4px base (`xs 4 · sm 8 · space3 12 · md 16 · space5 20 · lg 24 · xl 32 · space10 40 · xxl 48`).
- `fonts`: Space Grotesk (content) via `fonts.display`/`displayMedium`/`displaySemibold`/`displayBold`; JetBrains Mono (sensed data — distance, timestamps, counts, status) via `fonts.mono`/`monoMedium`/`monoSemibold`/`monoBold`. Loaded by `useFonts` in `RootNavigator` (render gated until ready). Space Grotesk is applied app-wide as the default via `applyDefaultFont()` (a `Text`/`TextInput` render patch — Phase-1 stopgap; React 19 deprecates `Text.defaultProps`).
- Governance rules from the design: never add a third hue (extend cyan/violet or use live/danger); mono is for sensed data only; pill (999) for actions, lg (14) for content, md (12) for inputs; the live pulser is the only looping animation; light mode is parity, not the default.

## Phase 2 — migration recipe (as shipped)

Goal: every screen reads the live palette so the toggle repaints instantly. One
uniform recipe was used **everywhere** — `shared/ui`, screen `layout/styles.ts`,
and their leaf sub-components alike. (Decision: leaf layout components call
`useThemedStyles` directly rather than threading a `colors` prop down — this
softens architecture.md's "pure layout = no hooks/store reads" rule, accepted in
exchange for far less boilerplate and tests that need no new props.)

```ts
// before
const styles = StyleSheet.create({ box: { color: colors.text } });
// after — module level
import type { ThemeColors } from '@/shared/theme';
const createStyles = (c: ThemeColors) =>
  StyleSheet.create({ box: { color: c.text } });
// after — inside the component
import { useThemedStyles } from '@/shared/theme/useThemedStyles';
import { useTheme } from '@/shared/theme/useTheme';
const styles = useThemedStyles(createStyles);
const { colors } = useTheme();   // only for non-StyleSheet color props:
                                 // gradient arrays, Icon color=, placeholderTextColor, SVG fill/stop
```
See [`Avatar.tsx`](../../localloop-mobile/src/shared/ui/Avatar.tsx) — the reference conversion.

**Notes from the migration:**
- Shared `styles.ts` files export a `createStyles(c)` factory; every consumer
  calls `useThemedStyles(createStyles)`. Factories sharing one source hit the same
  WeakMap cache → one StyleSheet per palette, no churn.
- In `.tsx` files that own a local StyleSheet *and* use `colors` for props, the
  factory parameter is named `colors` (so the StyleSheet body is untouched) while
  the component reads its own `const { colors } = useTheme()`.
- Module-level color tables (e.g. `StatusPill`, `RolePill`) resolve their color
  via `useTheme()` inside the component instead of baking it at module load.
- `createTypography(colors)` replaced the dark-baked `typography` in the Login /
  Onboarding / Map screens.

### Inventory (Phase 2 — done)
- 12 screen `layout/styles.ts` + ~62 `StyleSheet.create` sites migrated.
- Inline `rgba(...)` / hardcoded `#hex` moved onto the semantic tokens (incl. the
  SVG hero-glow `#B06CFF` → `colors.accent2`, `FailedMessageWarning` `#fff` →
  `colors.white`).
- **Final step (done):** removed the backward-compat `colors`/`typography` dark
  singletons from `theme/index.ts`; a clean `tsc` proves nothing reads the static
  palette anymore.
- Optional leftover (deferred): replace the `applyDefaultFont()` render patch with
  a themed `Text` primitive + the full per-component type scale.
