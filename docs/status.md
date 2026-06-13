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

**Phase 4 DM flow shipped end-to-end on mobile except for E2E.** DM-TASK-A through DM-TASK-H closed; S1/S2/S3 (API), M1, M2, M3 peer presence, M4, and DM-exception-candidates shipped. Chat feature clusters B, C, and E are closed and archived in [`done.md`](./done.md#chat-features-batch--closed-clusters); Cluster D reactions remains the only open chat-feature cluster. **Open DM work**: M5 Maestro E2E and Phase 5 DM polish. **Other open work**: Home open-group join UX fix, Phase 3 Slice 2 media upload, Phase 3 Slice 3 message permissions, and Phase 2 Redis cache. (HOME-12 Map shipped 2026-06-06 — see Last updated.)

---

## Last updated

> Keep only the 3 most recent entries here; archive older ones to [`history.md`](./history.md).

2026-06-12 — **Message send permissions enforced on the API (Slice 3 step 2/3)** on `feat/message-send-permissions` (api + shared docs), stacked on `fix/anchor-relocation-task` (api PR #36 / shared PR #47, both still open). Migration `1717500000000-AddGroupSendPermissions` creates `message_permission_enum` and adds `send_text_perm` + `send_media_perm ENUM NOT NULL DEFAULT 'all_members'` to `groups`. `SendMessageUseCase` now enforces `send_text_perm` after the ACTIVE-member check: `admin_only` → sender must be OWNER/MODERATOR; `members_in_radius` → sender's `users.geohash` must equal the group's `anchor_geohash` or one of its 8 neighbor cells (senders with no stored geohash are rejected); `all_members` → unchanged (no user lookup performed). Violations throw 403 `SEND_PERMISSION_DENIED`, which the WS send path already surfaces as an `ERROR` event. `CreateGroupUseCase` accepts both fields (defaulting to `all_members`), `UpdateGroupUseCase` passes them through, and `GET /groups/:id` + `PATCH /groups/:id` responses now expose `sendTextPerm`/`sendMediaPerm` so mobile's composer gating (step 3/3) can read them. `send_media_perm` is persisted but not enforced yet — media sending ships with Phase 3 Slice 2. `api-contracts.md` + `data-model.md` updated; no shared-types change (`MessagePermission` shipped in step 1/3). Tests: API Jest **61 suites / 448 tests green**, `tsc` + build clean. **Remaining Slice 3 work**: mobile wiring (step 3/3) and the location-freshness strategy for `members_in_radius` (`users.geohash` is still written only at onboarding).

2026-06-10 — **Anchor relocation on update shipped** on `fix/anchor-relocation-task` (api/mobile/shared). `PATCH /groups/:id` now accepts paired `lat`/`lng` for owners/moderators, validates both coordinates together, recomputes `anchorGeohash = coordinatesToGeohash(lat, lng)`, and persists `anchorLat`/`anchorLng`/`anchorGeohash` via `UpdateGroupData`, so the Group Detail edit map can move a group's public anchor and nearby discovery follows the new geohash cell. `anchorLabel` is now nullable end-to-end: migration drops `groups.anchor_label NOT NULL`, create/update normalize omitted/blank labels to `null`, `@localloop/shared-types@2.13.0` marks group labels nullable, and mobile leaves label fields/text empty when the API returns `null` instead of substituting a default. `api-contracts.md` documents the nullable create/update/detail/list/nearby contract and coordinate pair behavior. Tests: shared-types build/lint clean; API focused update/create specs green; full API Jest **61 suites / 436 tests green**; API build clean; mobile `tsc --noEmit` clean; full mobile Jest **80 suites / 619 tests green** via `npx jest --runInBand --forceExit` against the local shared-types 2.13 build.

2026-06-06 — **Map data wiring shipped — Map screen fully live** on `feat/map-screen-m6` (mobile, PR #36) + `docs/map-data-wiring` (shared docs). Closes [`MAP_INTEGRATION_HANDOFF.md`](../../localloop-mobile/MAP_INTEGRATION_HANDOFF.md) §8 — the Map's last open step — and **completes HOME-12**. `MOCK_PINS` deleted: [MapScreen/index.tsx](../../localloop-mobile/src/presentation/screens/MapScreen/index.tsx) now renders live `useNearbyGroups(coords, discoveryRadiusKm)` results as geo `<Marker>`s, with `useGroupListRealtime` presence counts gated by the shared `canShowPresence` (closed non-member groups never leak counts). **Extracted a shared `useGroupJoinFlow({ groups, navigation })` hook** (`src/application/hooks/useGroupJoinFlow/`) — lifted verbatim from HomeScreen's inline join/navigate/prompt logic and now consumed by **both** Home and Map. Navigation is **passed in** (not `useNavigation()`) so the application-layer hook stays free of a presentation dep and HomeScreen's existing test suite stays green as the refactor's regression guard. `canShowPresence`/`withLiveCount` moved to `src/shared/groups/presence.ts`. **Radius bound to the shared `discoveryRadiusKm` preference** (Home/Map/Profile share one radius); `MapRadiusControl` switched from continuous `onChange` to **commit-on-release `onCommit`** (`MapLayoutProps.onChangeRadius` → `onCommitRadius`) so dragging no longer writes to SecureStore / refetches per pan tick — note the Map now opens at the 25 km default instead of the old 0.5 km. Location-denied → query disabled (no pins, fallback center); the search box stays a non-filtering controlled input (both out of scope per §8). Tests: mobile **78 suites / 612 green** (+`useGroupJoinFlow`, +`presence`, +`MapScreen` container; `MapLayout` fixture updated), `tsc` clean. **Remaining Map work**: M5 Maestro E2E only.

---

## In progress

DM flow's last open task is **M5 Maestro E2E** (zero `.yaml` flows in the mobile repo). Phase 3 Slice 3 message permissions remains mid-flight: shared enum published (step 1/3) and API migration + `SendMessageUseCase` enforcement shipped (step 2/3, `feat/message-send-permissions` — stacked on the still-open anchor-relocation PRs); mobile composer gating (step 3/3) remains. Other near-term candidates: Home open-group join UX fix, Phase 3 Slice 2 media upload, and Phase 2 Redis cache. (Theming Phase 2 shipped 2026-06-05 — Light/Dark now repaints every screen; see Last updated + [`theming.md`](./theming.md).)

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

- [x] API: migration adds `send_text_perm` + `send_media_perm ENUM NOT NULL DEFAULT 'all_members'` to `groups`. `SendMessageUseCase` enforces the text policy: `admin_only` → sender must be `OWNER` or `MODERATOR`; `members_in_radius` → sender's geohash must be the group's anchor cell or one of its 8 neighbors; `all_members` → any member. `CreateGroupUseCase` + `UpdateGroupUseCase` accept and persist both fields; detail/update responses expose them. — shipped 2026-06-12 on `feat/message-send-permissions` (`send_media_perm` enforcement lands with Slice 2 media sending).
- [ ] Mobile: wire `sendPerm` + `sendMediaPerm` selectors in `CreateGroupScreen` to the API payload (removes the local-only pin). Composer disables text input / attach button when the active user's role doesn't satisfy the policy (derive from `myRole` + group detail `sendTextPerm`/`sendMediaPerm`). Show a contextual hint ("Apenas admins podem enviar mensagens") when disabled.
- [ ] **Location freshness for `MEMBERS_IN_RADIUS`**: `users.geohash` is currently written only once (onboarding) and never read by the policy's clients. The API now rejects `members_in_radius` sends from users with stale/missing geohash, so this matters before any group actually adopts the policy. Add a location update strategy: trigger `PATCH /users/me/location` on significant-change events (iOS/Android significant-location-change API) or on each app foreground; add a <300m no-op in `UpdateUserLocationUseCase` to avoid redundant DB writes on small movements.

### Home redesign — follow-ups

HOME-2 through HOME-7, HOME-9, HOME-10, HOME-11 shipped — see [`done.md` § Home redesign (closed items)](./done.md#home-redesign--closed-items). **HOME-12 (real Map screen) shipped 2026-06-06** — basemap + geo markers + live nearby-groups/presence/join wiring all complete; pins open the same join/navigate flow as Home (see Last updated + [`MAP_INTEGRATION_HANDOFF.md`](../../localloop-mobile/MAP_INTEGRATION_HANDOFF.md)). HOME-8 search deferred to Phase 5 — see [`backlog.md`](./backlog.md).

**Remaining**

- [ ] **Home open-group join UX fix**: tapping an OPEN discovery card should first show an enter-confirmation modal. The modal stays open with loading while `joinGroup` is pending; only navigate to `GroupChat` after join success. On failure, stay on Home and show an error instead of dropping the user into a chat with failed history loading.

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
| TD-12 | Messages module consolidation — group chat sends only via WebSocket, DM sends via HTTP+WebSocket. Nearly identical `SendMessageUseCase` logic, entity, and policy enforcement in two modules. Consolidate to single use case or add HTTP POST to group chat to make both symmetric. Blocks media-messaging and edit features if left unaddressed. | Phase 3 Slice 1 + Phase 4 DM API | Medium |

> Closed TD entries archived in [`done.md` § Closed technical debt](./done.md#closed-technical-debt).

---

## Known issues

No open known issues. Closed entries archived in [`done.md` § Closed known issues](./done.md#closed-known-issues).
