# Project Status

> Keep this file updated at the end of every session.
> This is the first file any agent reads to understand where the project is.
>
> Closed sections live in [`done.md`](./done.md). Pending tests live in
> [`testing-backlog.md`](./testing-backlog.md). Lower-priority backlog
> (Phase 5 polish, RQ migration tail, DevOps) lives in [`backlog.md`](./backlog.md).
> Detailed dated branch summaries live in [`history.md`](./history.md).

---

## Current phase

**Phase 4 DM flow shipped end-to-end on mobile except for push deep-link routing, DM presence, and E2E.** DM-TASK-A through DM-TASK-H closed; S1/S2/S3 (API), M1, M2, M4 shipped on mobile; DM-exception-candidates contract + API live. **Open DM work**: M3 push tap routing (no `addNotificationResponseReceivedListener` in the app; affects group chat deep-linking too) + `useDmPresence(peerId)` to drive `DmChatScreen` header's online dot (currently `peerStatus={null}`); M5 Maestro E2E; Phase 5 DM polish. **Other open work**: Phase 3 Slice 3 message permissions (API enforcement + mobile gating), GroupMembersScreen redesign, Phase 3 Slice 2 media upload, HOME-12 Map, Phase 2 Redis cache.

---

## Last updated

> Only the latest entries live here. Prior entries are archived in [`history.md`](./history.md).

2026-05-22 — Status restructure (doc-only on `docs/dm-flow-status`). Split closed work into [`done.md`](./done.md), pending tests into [`testing-backlog.md`](./testing-backlog.md), and lower-priority backlog (Phase 5 polish, RQ migration tail, DevOps) into [`backlog.md`](./backlog.md). `status.md` now carries only Current phase + Last updated + In progress + the in-flight subset of Up next + the open Pending decisions / Tech debt / Known issues tables. Phase 1, CI/CD, the DM-TASK-A–H block, and closed Home/Phase 2/Phase 3 slices are summarised inline with one-line pointers to `done.md` so agents don't lose context but stop re-reading 250+ lines of checkboxes every session.

2026-05-22 — Status reconciliation against mobile code (doc-only on `docs/dm-flow-status`). Confirmed M1/M2/M4 are already shipped and the status doc had drifted: [InboxScreen/index.tsx](../../localloop-mobile/src/presentation/screens/InboxScreen/index.tsx) consumes `useDmConversations` + `useDmRequests` + `useDmInboxRealtime` (no `MOCK_DMS`/`MOCK_REQUESTS` remain); [DmChatScreen/index.tsx](../../localloop-mobile/src/presentation/screens/DmChatScreen/index.tsx) is registered as `StackRoutes.DmChat` in `AuthenticatedStack`; `useAcceptDmRequest` + `useDeclineDmRequest` hooks back the request rows. Remaining DM mobile work narrowed to: M3 push tap routing (no `addNotificationResponseReceivedListener` anywhere in `localloop-mobile/src/` — affects group deep-linking too), `useDmPresence(peerId)` to feed `DmChatScreen`'s `peerStatus` (currently hard-coded to `null`), M5 Maestro E2E flows (no `.yaml` flows in the repo), and Phase 5 polish.

2026-05-21 — DM-exception-candidates API shipped on `feat/dm-exception-candidates-api` (API only — no shared bump). `GET /users/me/dm-exception-candidates` returns active users who share at least one ACTIVE group membership with the caller and are not already on the caller's `dm_permission_exceptions` list, ordered by `lower(display_name) ASC, user_id ASC` with optional case-insensitive substring `q` and keyset cursor `(displayName, userId)`. Implementation lives on the DM side: new `IDirectMessageRepository.listExceptionCandidates`, new `parseStringIdCursor(raw, f1, f2)` helper. Verification: 50/50 suites, 330/330 tests (+19), lint + build clean. Closes the Phase 4 → DM-exception-candidates API gap.

---

## In progress

DM flow now sits on three concrete gaps: (1) **push tap routing** — no `addNotificationResponseReceivedListener` exists in `localloop-mobile/src/`, so neither DM nor group push payloads deep-link; (2) **`useDmPresence(peerId)`** — `DmChatScreen` passes `peerStatus={null}` to its layout, the layout already renders the dot when fed an `online` status, but no hook subscribes to peer presence; (3) **M5 Maestro E2E** — zero `.yaml` flows in the mobile repo. Once those land the DM track closes apart from Phase 5 polish. Phase 3 Slice 3 message permissions also mid-flight: shared enum published (step 1/3); API migration + `SendMessageUseCase` enforcement (step 2/3) and mobile composer gating (step 3/3) remain. Other candidates: GroupMembersScreen redesign, HOME-12 Map, Phase 3 Slice 2 media upload, Phase 2 Redis cache.

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
- [ ] GroupMembersScreen redesign + unban: API surface complete — unban (`POST /groups/:id/members/:userId/unban` on `feat/unban-member-api`), role changes (`POST .../promote` and `POST .../demote` on `feat/member-role-changes`), and the banned-members list (`GET .../members/banned` on `feat/list-banned-members`). Mobile still needs the redesign that splits `GroupMembersScreen` into three sections — active members, join requests (only for approval-required groups), and banned users — with React Query-backed pagination/mutations and per-row promote/demote actions for owners.

> Pending integration tests + Maestro E2E for Phase 2 → [`testing-backlog.md`](./testing-backlog.md).

### Phase 3 — Chat

Slice 1 + Chat redesign Slice A/B shipped — see [`done.md` § Phase 3 (closed slices)](./done.md#phase-3--chat-closed-slices).

**Slice 2 — Media + remaining tests**

- [ ] Media upload: presigned URL endpoint + Supabase Storage integration.
- [ ] Mobile: media picker + image/video rendering in `GroupChatScreen`.

> WebSocket integration tests + Maestro E2E for Slice 2 → [`testing-backlog.md`](./testing-backlog.md).

**Slice 3 — Message permissions**

`sendPerm` and `sendMediaPerm` already exist as local-only fields in `CreateGroupScreen` (pinned by a container test — see memory). This slice makes them functional end-to-end. Shared enum already shipped (see done.md).

- [ ] API: migration adds `send_text_perm` + `send_media_perm ENUM NOT NULL DEFAULT 'ALL_MEMBERS'` to `groups`. `SendMessageUseCase` enforces the policy: `ADMIN_ONLY` → sender must be `OWNER` or `ADMIN`; `MEMBERS_IN_RADIUS` → sender's geohash must overlap the group's anchor geohash neighbors; `ALL_MEMBERS` → any member. `CreateGroupUseCase` + `UpdateGroupUseCase` accept and persist both fields.
- [ ] Mobile: wire `sendPerm` + `sendMediaPerm` selectors in `CreateGroupScreen` to the API payload (removes the local-only pin). Composer disables text input / attach button when the active user's role doesn't satisfy the policy (derive from `myRole` + group detail). Show a contextual hint ("Apenas admins podem enviar mensagens") when disabled.
- [ ] **Location freshness for `MEMBERS_IN_RADIUS`**: `users.geohash` is currently written only once (onboarding) and never read. Before enforcing `MEMBERS_IN_RADIUS` policy, add a location update strategy: trigger `PATCH /users/me/location` on significant-change events (iOS/Android significant-location-change API) or on each app foreground; add a <300m no-op in `UpdateUserLocationUseCase` to avoid redundant DB writes on small movements.

### Home redesign — follow-ups

HOME-2 through HOME-7, HOME-9, HOME-10, HOME-11 shipped — see [`done.md` § Home redesign (closed items)](./done.md#home-redesign--closed-items). HOME-8 search deferred to Phase 5 — see [`backlog.md`](./backlog.md).

**Remaining**

- [ ] **HOME-12** Mobile: real `MapScreen` replacing the current placeholder. Show nearby groups on a map using the existing location/radius model, with pins/clusters that open the same group chat/detail flow as Home.

### Phase 4 — DMs + Push Notifications

Foundation, DM-TASK-A through H, S1/S2/S3, M1, M2, M4, and DM-exception-candidates are all shipped — see [`done.md` § Phase 4](./done.md#phase-4--dms--push-notifications).

**Remaining**

#### M3 · Mobile: push tap routing + peer presence

- `useDmPresence(peerId)` — new hook that subscribes to peer presence over the chat socket and feeds the existing `peerStatus` prop on `DmChatLayout` so the header dot lights up. Mirrors the inline presence handling already in `useGroupChat` / `useGroupListRealtime`; no `useGroupPresence` exists today, so the shared shape can be designed fresh.
- Push tap routing — no `addNotificationResponseReceivedListener` exists anywhere in `localloop-mobile/src/`. Add a single listener at app startup that inspects the payload (group vs DM) and `navigation.navigate(StackRoutes.DmChat, { peerId, ... })` or the group equivalent. Also dedups against the WS event when both fire for the same message.
- `useDmInboxRealtime` is already wired in `InboxScreen` and refreshes the conversations cache from `dm_summary_update`, so the realtime half of the original M3 is done.

#### M5 · Maestro E2E

No Maestro flows exist in the mobile repo yet — see the Phase 4 block in [`testing-backlog.md`](./testing-backlog.md). Blocked on M3 for the push-tap flow.

**Open decisions**

- Gateway: keep DM events on `ChatGateway` (current) vs. split into a `/dm` namespace. Split simplifies permission rules; current reuses the connection.
- Exception-list size cap: not enforced today. Revisit only if a user accumulates an unreasonable list (UX or storage cost).

### Phase 5 — Polish, RQ migration tail, DevOps

See [`backlog.md`](./backlog.md).

---

## Pending decisions blocking work

No open decisions blocking active work. Resolved decisions archived in [`done.md` § Resolved decisions](./done.md#resolved-decisions).

---

## Technical debt

| ID | Description | Introduced | Priority |
|----|-------------|-----------|---------|
| TD-09 | Mobile REST endpoints use ad-hoc `useState + useEffect` in every screen — no cache, no dedup, no optimistic updates. Decision: migrate to `@tanstack/react-query`. Pilot + Home/GroupDetail/GroupMembers/JoinRequests migrations shipped (see done.md); remaining surfaces tracked in [`backlog.md` § RQ migration backlog](./backlog.md#rq-migration-backlog-td-09--remaining). | Phase 2 mobile | Medium |
| TD-11 | API spec files duplicate repository mock builders — `buildGroupRepoMock` extracted to `src/modules/groups/test/group-repo.mock.ts` (done). Remaining: `IUserRepository` mock repeated across 7 specs in auth/user/messages modules → `src/modules/auth/test/user-repo.mock.ts`; `IMessageRepository` mock repeated across 3 messages specs → `src/modules/messages/test/message-repo.mock.ts`. | Test maintenance | Low |
| TD-12 | Messages module consolidation — group chat sends only via WebSocket, DM sends via HTTP+WebSocket. Nearly identical `SendMessageUseCase` logic, entity, and policy enforcement in two modules. Consolidate to single use case or add HTTP POST to group chat to make both symmetric. Blocks media-messaging and edit features if left unaddressed. | Phase 3 Slice 1 + Phase 4 DM API | Medium |
| TD-13 | `MessagesModule` ↔ `DirectMessagesModule` are coupled both ways and only boot because of `forwardRef` on both sides. Edge 1 (preexisting): `ChatGateway` injects `SendDirectMessageUseCase`. Edge 2 (added by DM-TASK-C): `DirectMessagesController` injects `ChatGateway` to emit `dm_request_accepted` after the HTTP accept handler. `forwardRef` fixes the boot-order symptom but the architectural cycle remains — modules can't be reused/tested independently and a `ChatGateway` constructor change can break the DM controller at boot rather than edit time. **Option 1 (port/adapter)**: define `IDmEventEmitter` in DirectMessages domain, `ChatGateway` implements it, controller injects the interface token — DM no longer imports MessagesModule. Cycle gone. **Option 2 (extract gateway)**: move `ChatGateway` to a new `RealtimeModule` that neither Messages nor DirectMessages depends on, both consume it. Cleanest seam, biggest change. Re-evaluate when DM-TASK-E/F add more gateway emit paths from the DM controller — that's the trigger to pick one. | DM-TASK-C wiring | Medium |

> Closed TD entries archived in [`done.md` § Closed technical debt](./done.md#closed-technical-debt).

---

## Known issues

No open known issues. Closed entries archived in [`done.md` § Closed known issues](./done.md#closed-known-issues).
