# Theming — Design System & Light/Dark

> Source of truth for color/type/spacing/radius is the mobile theme module
> [`localloop-mobile/src/shared/theme/index.ts`](../../localloop-mobile/src/shared/theme/index.ts).
> Values are lifted from the Claude Design handoff bundle ("LocalLoop — Design
> System", v1.0, 26 May 2026). When this doc and the code disagree, the code wins.

## Status: Phase 1 shipped, Phase 2 pending

The design system + theming **infrastructure** is in place. The live in-place
Light/Dark toggle is **not** fully wired across screens yet — that is Phase 2.

- **Phase 1 (done):** both palettes with exact design values, the radius scale,
  the two fonts (Space Grotesk + JetBrains Mono), the theme store, `useTheme()` /
  `useThemedStyles()` hooks, navigation theme + StatusBar following the mode, and
  the Profile Light/Dark toggle persisting the preference.
- **Phase 2 (pending):** convert the ~60 `StyleSheet.create` sites to read colors
  at render time so the toggle repaints every screen instantly (recipe below).

### Why two phases — the technical constraint

React Native's `StyleSheet.create()` resolves color values **once, at module
load**, and bakes them in. So updating a centralized palette cannot repaint a
already-rendered screen. To switch theme at runtime a style must be created at
**render time** from the active palette. Until a screen is migrated, it keeps
the static `colors` import and renders in **dark** (the design's default —
"light is parity, not the default"). Switching to Light today repaints only
render-time surfaces (StatusBar, navigation background, migrated components).

## Palettes

Both palettes expose identical keys (enforced by `lightColors: ThemeColors`).
Existing app token names are kept so the ~87 importers compile unchanged; design
tokens are mapped onto them.

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
`quotedReplyBg`.

## Scales, fonts, governance

- `radius`: `xs 6 · sm 8 · md 12 · lg 14 · xl 16 · xxl 22 · pill 999`.
- `spacing`: 4px base (`xs 4 · sm 8 · space3 12 · md 16 · space5 20 · lg 24 · xl 32 · space10 40 · xxl 48`).
- `fonts`: Space Grotesk (content) via `fonts.display`/`displayMedium`/`displaySemibold`/`displayBold`; JetBrains Mono (sensed data — distance, timestamps, counts, status) via `fonts.mono`/`monoMedium`/`monoSemibold`/`monoBold`. Loaded by `useFonts` in `RootNavigator` (render gated until ready). Space Grotesk is applied app-wide as the default via `applyDefaultFont()` (a `Text`/`TextInput` render patch — Phase-1 stopgap; React 19 deprecates `Text.defaultProps`).
- Governance rules from the design: never add a third hue (extend cyan/violet or use live/danger); mono is for sensed data only; pill (999) for actions, lg (14) for content, md (12) for inputs; the live pulser is the only looping animation; light mode is parity, not the default.

## Phase 2 — migration recipe

Goal: every screen reads the live palette so the toggle repaints instantly. Two
tiers, depending on whether the file may use hooks.

### Tier A — `shared/ui/**` and other hookable components
```ts
// before
const styles = StyleSheet.create({ box: { color: colors.text } });
// after
import { useThemedStyles } from '@/shared/theme/useThemedStyles';
import { useTheme } from '@/shared/theme/useTheme';
import type { ThemeColors } from '@/shared/theme';
// inside the component:
const styles = useThemedStyles(createStyles);
const { colors } = useTheme();            // only for non-StyleSheet color props
// module level:
const createStyles = (c: ThemeColors) =>
  StyleSheet.create({ box: { color: c.text } });
```
See [`Avatar.tsx`](../../localloop-mobile/src/shared/ui/Avatar.tsx) — the reference conversion.

### Tier B — pure screen layouts (`screens/*/layout/`)
`layout/index.tsx` is pure (no hooks/store reads) and `layout/styles.ts` may
import only `@/shared/theme` + React Native. So the **container** reads the
theme and passes `colors` down; the layout calls a plain factory:
```ts
// styles.ts
export const createStyles = (c: ThemeColors) => StyleSheet.create({ ... });
// container index.tsx
const { colors } = useTheme();
return <Layout colors={colors} ... />;
// layout/index.tsx (still pure — createStyles is a plain function, not a hook)
const styles = createStyles(colors);
```

### Inventory (Phase 2 scope)
- 12 screen `layout/styles.ts` + ~59 `StyleSheet.create` sites total.
- 21 files with inline `rgba(...)` → move onto the semantic alpha tokens.
- 6 files with hardcoded `#hex` outside the theme dir → tokenize.
- Final step: remove the backward-compat `colors`/`typography` dark singletons
  from `theme/index.ts`; a clean `tsc` then proves nothing reads the static
  palette anymore.
