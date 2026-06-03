# Project Status

> Keep this file updated at the end of every session.
> This is the first file any agent reads to understand where the project is.
>
> Closed sections live in [`done.md`](./done.md). Pending tests live in
> [`testing-backlog.md`](./testing-backlog.md). Lower-priority backlog
> (Phase 5 polish, blocked/deferred work, DevOps) lives in [`backlog.md`](./backlog.md).
> Detailed dated branch summaries live in [`history.md`](./history.md).

---

## Current phase

**Phase 4 DM flow shipped end-to-end on mobile except for E2E.** DM-TASK-A through DM-TASK-H closed; S1/S2/S3 (API), M1, M2, M3 peer presence, M4, and DM-exception-candidates shipped. Chat feature clusters B, C, and E are closed and archived in [`done.md`](./done.md#chat-features-batch--closed-clusters); Cluster D reactions remains the only open chat-feature cluster. **Open DM work**: M5 Maestro E2E and Phase 5 DM polish. **Other open work**: Home open-group join UX fix, Phase 3 Slice 2 media upload, Phase 3 Slice 3 message permissions, HOME-12 Map, and Phase 2 Redis cache.

---

## Last updated

> Keep only the 3 most recent entries here; archive older ones to [`history.md`](./history.md).

2026-06-03 — Design system + theming foundation (Phase 1 of 2) on `feat/design-system-theming` (mobile + shared docs). Imported the Claude Design handoff bundle ("LocalLoop — Design System" v1.0) and implemented the design system itself + the light/dark **infrastructure**, deliberately stopping short of converting the ~60 style files (Phase 2). **Mobile**: `src/shared/theme/index.ts` rewritten with `darkColors` + `lightColors` (exact design hex, identical keys via `ThemeColors`), a `radius` scale, the design's `spacing`/`fonts` tokens, and a `createTypography(c)` factory; `colors`/`typography` keep dark-baked backward-compat exports so all 87 importers compile unchanged and the app immediately adopts the refined **dark** palette (bg `#0F0F0F`→`#0A0A0D`, accent `#00D1FF`→`#00D9FF`, etc.). New `theme.store.ts` (Zustand + secure-store, default `dark` per the design's "light is parity" rule, `STORAGE_KEYS.THEME_PREFERENCE`), `useTheme()` + `useThemedStyles()` hooks (the Phase-2 conversion tool, WeakMap-cached). Fonts shipped: `expo-font` + Space Grotesk + JetBrains Mono installed, loaded via `useFonts` in `RootNavigator` (render gated), with `applyDefaultFont()` applying Space Grotesk app-wide via a `Text`/`TextInput` render patch (React-19 stopgap). `RootNavigator` now inits the theme store, themes `NavigationContainer`, and the loading view + `StatusBar` follow the mode; ProfileScreen's toggle persists the real preference; `Avatar.tsx` converted as the reference Tier-A component. Constraint that forced the two phases: RN `StyleSheet.create()` bakes colors at module load, so static screens stay dark until Phase 2 migrates them to render-time styles — switching to Light today repaints only render-time surfaces. **Shared**: new [`theming.md`](./theming.md) (palette table + Phase-2 migration recipe + file inventory). Tests: 71 suites / 564 (added `theme.store` + `useThemedStyles` specs; mocked `expo-font` + google-fonts and extended the RootNavigator nav mock); `tsc` clean; no snapshots existed so the palette value change broke nothing.

2026-06-03 — Docs cleanup on `docs/status-cleanup` (shared docs only). TD-09 is closed as the React Query migration debt; stale remaining RQ backlog items were removed, large-list pagination moved to Phase 5 polish, and the Home open-group join failure path was promoted to Up next as a focused UX fix. Completed chat clusters B, C, and E moved out of `status.md` into `done.md`, with detailed E2/E5 branch summaries archived in `history.md`.

2026-06-01 — History tombstone durability fix on `fix/history-include-tombstones` (API + shared docs). **Problem**: C6/PR #29 surfaced `isDeleted` on every message payload and C10 renders the "Mensagem apagada" tombstone, but `listByGroup` + `listConversation` still carried `.andWhere('m.is_deleted = false')` (the same filter the C3+C4 entry leaned on with "deleted messages drop out of the next GET …"). A soft-deleted message therefore became a tombstone only via the live `MESSAGE_DELETED` / `DIRECT_MESSAGE_DELETED` WS event — it vanished entirely on history reload or pagination, so C10 was not durable. **Fix (API)**: dropped the `is_deleted = false` filter from both history list queries so soft-deleted rows are returned in `created_at` order and keep their page slot (cursor pagination is now stable across deletes instead of silently shrinking pages). To avoid shipping deleted content over the wire, `rowToMessage` / `rowToDm` now null `content` + `mediaUrl` + `mediaType` whenever `is_deleted` is true — mirroring the deleted-reply-parent handling (`snippet: null`) already in those mappers and the mobile delete helpers that blank `content`. **Left filtering deleted on purpose**: the `markAsDeleted` / `markAsEdited` idempotency guards, the `getConversationReadState` thread-existence probe (+ its SQL assertion), and the group/DM inbox last-message previews. No migration; no shared-types change (`ChatMessage.content` is already `string | null`, `isDeleted` already present). Tests: 60 suites / 422 — added tombstone-forwarding cases to both history use-case specs plus repo mapping specs proving a deleted row maps to `isDeleted: true` with nulled content/media (new `message.typeorm.repository.spec.ts`, the group repo's first unit spec). Verification gap: no local Postgres, so the changed SQL was not exercised against a real DB before merge (same caveat as C1–C6).

---

## In progress

DM flow's last open task is **M5 Maestro E2E** (zero `.yaml` flows in the mobile repo). Phase 3 Slice 3 message permissions remains mid-flight: shared enum published (step 1/3); API migration + `SendMessageUseCase` enforcement (step 2/3) and mobile composer gating (step 3/3) remain. Other near-term candidates: **Theming Phase 2** (convert the ~60 `StyleSheet.create` sites to render-time styles via `useThemedStyles`/`createStyles(colors)` so the Light/Dark toggle repaints every screen — recipe + inventory in [`theming.md`](./theming.md)), Home open-group join UX fix, HOME-12 Map, Phase 3 Slice 2 media upload, and Phase 2 Redis cache.

---

## Up next

### Phase 1 — Complete Foundation ✅

Fully shipped — see [`done.md` § Phase 1](./done.md#phase-1--complete-foundation-).

### CI/CD ✅

Fully shipped — see [`done.md` § CI/CD](./done.md#cicd-).

### Phase 2 — Groups

Vertical + moderation slices shipped — see [`done.md` § Phase 2 (closed slices)](./done.md#phase-2--groups-closed-slices).

**Remaining**

- [ ] Redis cache for `GET /groups/nearby` (TTL = 5min per geohash cell) — unblocked (DP-01 resolved → Upstash).

> Pending integration tests + Maestro E2E for Phase 2 → [`testing-backlog.md`](./testing-backlog.md).

### Phase 3 — Chat

Slice 1 + Chat redesign Slice A/B shipped — see [`done.md` § Phase 3 (closed slices)](./done.md#phase-3--chat-closed-slices).

**Slice 2 — Media + remaining tests**

- [ ] Media upload: presigned URL endpoint + Supabase Storage integration.
- [ ] Mobile: media picker + image/video rendering in `GroupChatScreen`.

> WebSocket integration tests + Maestro E2E for Slice 2 → [`testing-backlog.md`](./testing-backlog.md).

**Slice 3 — Message permissions**

`sendPerm` and `sendMediaPerm` already exist as local-only fields in `CreateGroupScreen` (pinned by a container test — see memory). This slice makes them functional end-to-end. Shared enum already shipped (see done.md).

- [ ] API: migration adds `send_text_perm` + `send_media_perm ENUM NOT NULL DEFAULT 'ALL_MEMBERS'` to `groups`. `SendMessageUseCase` enforces the policy: `ADMIN_ONLY` → sender must be `OWNER` or `MODERATOR`; `MEMBERS_IN_RADIUS` → sender's geohash must overlap the group's anchor geohash neighbors; `ALL_MEMBERS` → any member. `CreateGroupUseCase` + `UpdateGroupUseCase` accept and persist both fields.
- [ ] Mobile: wire `sendPerm` + `sendMediaPerm` selectors in `CreateGroupScreen` to the API payload (removes the local-only pin). Composer disables text input / attach button when the active user's role doesn't satisfy the policy (derive from `myRole` + group detail). Show a contextual hint ("Apenas admins podem enviar mensagens") when disabled.
- [ ] **Location freshness for `MEMBERS_IN_RADIUS`**: `users.geohash` is currently written only once (onboarding) and never read. Before enforcing `MEMBERS_IN_RADIUS` policy, add a location update strategy: trigger `PATCH /users/me/location` on significant-change events (iOS/Android significant-location-change API) or on each app foreground; add a <300m no-op in `UpdateUserLocationUseCase` to avoid redundant DB writes on small movements.

### Home redesign — follow-ups

HOME-2 through HOME-7, HOME-9, HOME-10, HOME-11 shipped — see [`done.md` § Home redesign (closed items)](./done.md#home-redesign--closed-items). HOME-8 search deferred to Phase 5 — see [`backlog.md`](./backlog.md).

**Remaining**

- [ ] **Home open-group join UX fix**: tapping an OPEN discovery card should first show an enter-confirmation modal. The modal stays open with loading while `joinGroup` is pending; only navigate to `GroupChat` after join success. On failure, stay on Home and show an error instead of dropping the user into a chat with failed history loading.
- [ ] **HOME-12** Mobile: real `MapScreen` replacing the current placeholder. Show nearby groups on a map using the existing location/radius model, with pins/clusters that open the same group chat/detail flow as Home.

### Phase 4 — DMs + Push Notifications

Foundation, DM-TASK-A through H, S1/S2/S3, M1-M4 (including M3 peer presence and push routing), DM-exception-candidates, and chat feature clusters B/C/E are shipped — see [`done.md` § Phase 4](./done.md#phase-4--dms--push-notifications) and [`done.md` § Chat features batch](./done.md#chat-features-batch--closed-clusters).

**Remaining**

- [ ] **M5 · Maestro E2E**: no Maestro flows exist in the mobile repo yet — see the Phase 4 block in [`testing-backlog.md`](./testing-backlog.md).

**Open decisions**

- Exception-list size cap: not enforced today. Revisit only if a user accumulates an unreasonable list (UX or storage cost).

### Chat Features Batch

Clusters B, C, and E are closed; blocked push-avatar work moved to [`backlog.md`](./backlog.md). Cluster D reactions remains the active standalone chat-feature batch.

#### Cluster D · Reactions (full-stack, standalone)

Kept separate from C: new table, own endpoints, own picker UI. Ships last because reactions sit on top of C's tombstone behaviour (don't react to deleted messages).

- [ ] D1 — **API**: migration — `message_reactions(message_id, user_id, emoji, created_at)` with unique `(message_id, user_id, emoji)`.
- [ ] D2 — **API**: `POST /messages/:id/reactions { emoji }` + `DELETE /messages/:id/reactions/:emoji`, and DM variant.
- [ ] D3 — **API**: message read endpoints embed `reactions: [{ emoji, count, mine }]`.
- [ ] D4 — **API**: emit `message_reaction_changed` over WS.
- [ ] D5 — **Shared**: `MessageReaction` type + `reactions[]` summary field on message types.
- [ ] D6 — **Mobile**: single-tap on bubble → emoji picker overlay (claude design assets).
- [ ] D7 — **Mobile**: reaction chips under bubble; tap own chip to remove, tap others' to add yours.
- [ ] D8 — **Mobile**: WS-driven live updates of the reaction summary.

### Phase 5 — Polish + DevOps

See [`backlog.md`](./backlog.md).

---

## Pending decisions blocking work

No open decisions blocking active work. Resolved decisions archived in [`done.md` § Resolved decisions](./done.md#resolved-decisions).

---

## Technical debt

| ID | Description | Introduced | Priority |
|----|-------------|-----------|---------|
| TD-11 | API spec files duplicate repository mock builders — `buildGroupRepoMock` and `buildMessageRepoMock` extracted (done). Remaining: `IUserRepository` mock repeated across 7 specs in auth/user/messages modules → `src/modules/auth/test/user-repo.mock.ts`. | Test maintenance | Low |
| TD-12 | Messages module consolidation — group chat sends only via WebSocket, DM sends via HTTP+WebSocket. Nearly identical `SendMessageUseCase` logic, entity, and policy enforcement in two modules. Consolidate to single use case or add HTTP POST to group chat to make both symmetric. Blocks media-messaging and edit features if left unaddressed. | Phase 3 Slice 1 + Phase 4 DM API | Medium |

> Closed TD entries archived in [`done.md` § Closed technical debt](./done.md#closed-technical-debt).

---

## Known issues

No open known issues. Closed entries archived in [`done.md` § Closed known issues](./done.md#closed-known-issues).
