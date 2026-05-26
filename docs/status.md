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

**Phase 4 DM flow shipped end-to-end on mobile except for DM presence and E2E.** DM-TASK-A through DM-TASK-H closed; S1/S2/S3 (API), M1, M2, M4 shipped on mobile; DM-exception-candidates contract + API live; Cluster A push tap routing/cleanup/dedup, payload metadata, and immediate per-chat digest replacement are implemented. **Open DM work**: `useDmPresence(peerId)` to drive `DmChatScreen` header's online dot (currently `peerStatus={null}`); M5 Maestro E2E; Phase 5 DM polish. **Other open work**: Phase 3 Slice 3 message permissions (API enforcement + mobile gating), GroupMembersScreen redesign, Phase 3 Slice 2 media upload, HOME-12 Map, Phase 2 Redis cache.

---

## Last updated

> Only the latest entries live here. Prior entries are archived in [`history.md`](./history.md).

2026-05-26 — B1 DM last-read exposure implemented on `feat/dm-last-read-exposure` (API) + `docs/dm-last-read-exposure` (shared docs). Confirmed `dm_conversation_state.last_read_at` already exists, so no migration was added. `GET /dm` now exposes caller-scoped `lastReadAt` beside `unreadCount`; `GET /dm/:userId` exposes top-level `lastReadAt` and `peerLastReadAt` to seed read-receipt UI. Read-state exposure is gated to delivered, non-deleted DM threads; absent state rows serialize as `null`.

2026-05-24 — A2 immediate per-chat push digest implemented on `feat/chat-push-digest` (API + shared docs). API adds persisted `chat_notification_digests` keyed by recipient + `conversationKey`, records the newest 4 snippets per chat, resets stale digest state after 30 minutes, and sends replacement notifications with stable `collapseId` + Android `tag` (`chat:{recipientUserId}:{conversationKey}`). First digest push keeps sound; replacement pushes set `sound: null`. Group fan-out now builds digests per recipient while preserving offline-room exclusions; DM fan-out does the same for the recipient. `join_group`, `join_dm`, `mark_group_read`, and `mark_dm_read` clear the matching digest state so the next later push starts fresh. Mobile parser/routing contract is unchanged.

2026-05-22 — Cluster A push routing/payload shipped on `feat/push-tap-routing` (shared + API + mobile). **Shared**: `@localloop/shared-types@2.2.0` adds `ChatPushNotificationData` (`group_message` + `direct_message`) with notification-only `conversationKey`. **API**: group push payload now includes `conversationKey`, `groupName`, `anchorType`, `senderName`, and `senderAvatarUrl`; DM push payload includes `conversationKey`, `peerName`, and `peerAvatarUrl`. **Mobile**: one startup `addNotificationResponseReceivedListener` plus cold-start response handling deep-links authenticated users into `GroupChat`/`DmChat`; chat screens mark the active `conversationKey`, dismiss matching presented notifications, and suppress foreground banners when the active chat or a seen WS message already covers the push. **A6 result**: strict Android top-left large-icon is not available through the current Expo push payload (`richContent.image` is big-picture, not large-icon), so avatar rendering remains blocked on native/FCM customization. **Still open**: A2 true per-chat digest grouping, A7 iOS notification service extension, DM peer presence, and Maestro E2E.

2026-05-22 — Chat enrichments added to the features batch (doc-only on `docs/chat-features-additions`). Cluster C grows to "reply + delete + edit" (edit is a near-mirror of delete on the same migration — adds `edited_at` column, edit use cases with **the same authz as delete** (DM: own only; group: own if regular member, any if `OWNER`/`ADMIN`), `PATCH /messages/:id` + DM counterpart, `message_edited` WS event, ActionSheet entry, edit composer state, "editado" suffix on the bubble). New Cluster E covers send-failure + retry — universal (DM + group), mobile-mostly, ships any time and is a candidate to land **before** A since it directly fixes a UX gap users hit today (failed sends silently disappear). E surfaces a `sendStatus: 'sending' | 'sent' | 'failed'` on the optimistic bubble, renders the failed bubble + retry affordance per claude design assets, and re-fires the same mutation with a stable `clientMessageId` on retry. Intro re-counted to five clusters; ship order suggestion is now E → A → B → C → D (E first if any one-day window opens; otherwise still A first).

2026-05-22 — Chat features batch planned (doc-only on `docs/chat-features-plan`). Added "Chat features batch — Clusters A–D" section to Up next, grouping six new mobile asks (reply messages, push grouping, push cleanup, DM read receipts, reactions, delete on long-press) with already-tracked work (M3 push tap routing absorbed into Cluster A; `useDmPresence(peerId)` absorbed into Cluster B). Cluster A also picks up push-payload + avatar rendering: A5 extends the API payload (chat id, message id, avatar URL), A6 renders the avatar as the Android notification's top-left large-icon, A7 ships the iOS Notification Service Extension and is **deferred** (blocked on iOS native infra — tracked, not started). Ship order A→B→C→D — A is mostly mobile and lands fastest, B finishes DM polish, C is the biggest migration (and re-opens TD-12/TD-13 as gating decisions), D ships last because reactions sit on top of C's tombstone behaviour. Tasks that hit blockers will drop to [`backlog.md`](./backlog.md); for now they live here.

2026-05-22 — Status restructure (doc-only on `docs/dm-flow-status`). Split closed work into [`done.md`](./done.md), pending tests into [`testing-backlog.md`](./testing-backlog.md), and lower-priority backlog (Phase 5 polish, RQ migration tail, DevOps) into [`backlog.md`](./backlog.md). `status.md` now carries only Current phase + Last updated + In progress + the in-flight subset of Up next + the open Pending decisions / Tech debt / Known issues tables. Phase 1, CI/CD, the DM-TASK-A–H block, and closed Home/Phase 2/Phase 3 slices are summarised inline with one-line pointers to `done.md` so agents don't lose context but stop re-reading 250+ lines of checkboxes every session.

2026-05-22 — Status reconciliation against mobile code (doc-only on `docs/dm-flow-status`). Confirmed M1/M2/M4 are already shipped and the status doc had drifted: [InboxScreen/index.tsx](../../localloop-mobile/src/presentation/screens/InboxScreen/index.tsx) consumes `useDmConversations` + `useDmRequests` + `useDmInboxRealtime` (no `MOCK_DMS`/`MOCK_REQUESTS` remain); [DmChatScreen/index.tsx](../../localloop-mobile/src/presentation/screens/DmChatScreen/index.tsx) is registered as `StackRoutes.DmChat` in `AuthenticatedStack`; `useAcceptDmRequest` + `useDeclineDmRequest` hooks back the request rows. Remaining DM mobile work narrowed to: M3 push tap routing (no `addNotificationResponseReceivedListener` anywhere in `localloop-mobile/src/` — affects group deep-linking too), `useDmPresence(peerId)` to feed `DmChatScreen`'s `peerStatus` (currently hard-coded to `null`), M5 Maestro E2E flows (no `.yaml` flows in the repo), and Phase 5 polish.

2026-05-21 — DM-exception-candidates API shipped on `feat/dm-exception-candidates-api` (API only — no shared bump). `GET /users/me/dm-exception-candidates` returns active users who share at least one ACTIVE group membership with the caller and are not already on the caller's `dm_permission_exceptions` list, ordered by `lower(display_name) ASC, user_id ASC` with optional case-insensitive substring `q` and keyset cursor `(displayName, userId)`. Implementation lives on the DM side: new `IDirectMessageRepository.listExceptionCandidates`, new `parseStringIdCursor(raw, f1, f2)` helper. Verification: 50/50 suites, 330/330 tests (+19), lint + build clean. Closes the Phase 4 → DM-exception-candidates API gap.

---

## In progress

DM flow now sits on two concrete gaps: (1) **`useDmPresence(peerId)`** — `DmChatScreen` passes `peerStatus={null}` to its layout, the layout already renders the dot when fed an `online` status, but no hook subscribes to peer presence; (2) **M5 Maestro E2E** — zero `.yaml` flows in the mobile repo. Once those land the DM track closes apart from Phase 5 polish. Phase 3 Slice 3 message permissions also mid-flight: shared enum published (step 1/3); API migration + `SendMessageUseCase` enforcement (step 2/3) and mobile composer gating (step 3/3) remain. Other candidates: GroupMembersScreen redesign, HOME-12 Map, Phase 3 Slice 2 media upload, Phase 2 Redis cache.

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

#### M3 · Mobile: peer presence

- `useDmPresence(peerId)` — new hook that subscribes to peer presence over the chat socket and feeds the existing `peerStatus` prop on `DmChatLayout` so the header dot lights up. Mirrors the inline presence handling already in `useGroupChat` / `useGroupListRealtime`; no `useGroupPresence` exists today, so the shared shape can be designed fresh.
- Push tap routing is closed by Cluster A on `feat/push-tap-routing`: mobile registers a single response listener, handles cold-start responses, routes group/DM payloads, dismisses matching presented notifications on chat mount, and suppresses foreground duplicates.
- `useDmInboxRealtime` is already wired in `InboxScreen` and refreshes the conversations cache from `dm_summary_update`, so the realtime half of the original M3 is done.

#### M5 · Maestro E2E

No Maestro flows exist in the mobile repo yet — see the Phase 4 block in [`testing-backlog.md`](./testing-backlog.md). Blocked on M3 for the push-tap flow.

**Open decisions**

- Gateway: keep DM events on `ChatGateway` (current) vs. split into a `/dm` namespace. Split simplifies permission rules; current reuses the connection.
- Exception-list size cap: not enforced today. Revisit only if a user accumulates an unreasonable list (UX or storage cost).

### Chat features batch — Clusters A–E

Planned next. Five clusters grouping eight new mobile asks (reply, push grouping, push cleanup, DM read receipts, reactions, delete on long-press, **edit on long-press**, **failed-send + retry**) with already-tracked work (`useDmPresence(peerId)`; M3 push tap routing is now closed by A1). Suggested ship order **E → A → B → C → D**: E is the smallest and most universal (fixes a current UX gap where failed sends silently disappear), A2/B/C/D remain open. Tasks that hit blockers drop to [`backlog.md`](./backlog.md).

#### Cluster A · Push notifications

Absorbs **M3 push tap routing** from Phase 4 above. Completed routing/cleanup/dedup work centers on the Expo notification listener; remaining digest/avatar tasks are separate slices.

- [x] A1 — Register `addNotificationResponseReceivedListener` at app startup; route to `StackRoutes.DmChat` or the group chat route by payload `type`. *(was M3)*
- [x] A2 — True per-chat notification digest: API stores per-recipient digest state and immediately sends/replaces one notification per `conversationKey` with the newest snippets that fit. Uses Expo `collapseId` + Android `tag`; replacement pushes are silent.
- [x] A3 — On chat screen mount (DM + group), call `dismissNotificationAsync` for any notification whose payload `conversationKey` matches the open conversation.
- [x] A4 — Dedup against WS: if the message already arrived over socket while the chat was open, suppress the foreground notification.
- [x] A5 — **Shared + API + Mobile**: `ChatPushNotificationData` now carries `conversationKey`, message id, route metadata, and sender/peer avatar URL. Group payload omits `groupAvatarUrl` because no group avatar model exists.
- [ ] A6 — **Mobile (Android)**: strict top-left notification large-icon remains blocked. Current Expo push supports `richContent.image` (big-picture) but not Android `largeIcon`; do not implement an image fallback unless native/FCM customization is approved.
- [ ] A7 — **Mobile (iOS)**: Notification Service Extension to fetch and attach the avatar so iOS renders the image. **Deferred — blocked on dev-build / native infra. Tracked here so it isn't lost; do not start until iOS native work is unblocked.**

#### Cluster B · DM peer state (small API + mobile)

Absorbs **`useDmPresence(peerId)`** from Phase 4 above. Read receipts (sending/sent/read) and presence share the same WS subscription shape.

- [x] B1 — **API**: confirmed `dm_conversation_state.last_read_at` exists per DM participant; no migration needed. `GET /dm` exposes caller `lastReadAt`, and `GET /dm/:userId` exposes caller `lastReadAt` + `peerLastReadAt`.
- [ ] B2 — **API**: emit `dm_read_receipt` over WS when peer calls `POST /dm/:peerId/read` or sends `dm_mark_read`. `SendDirectMessageUseCase` emits `sent` on persist.
- [ ] B3 — **Shared**: extend `DirectMessage` with `status: 'sending' | 'sent' | 'read'` (or derive client-side from `lastReadAt` — settle during impl).
- [ ] B4 — **Mobile**: `useDmPresence(peerId)` hook → header dot in `DmChatLayout` (replaces hard-coded `peerStatus={null}`). *(was Phase 4)*
- [ ] B5 — **Mobile**: `useDmReadState(peerId)` hook → bubble checkmark state.
- [ ] B6 — **Mobile**: `DmMessageBubble` renders status icon per claude design assets (shipped together with the reply assets).

#### Cluster C · Message lifecycle: reply + delete + edit (full-stack)

One migration covers all three columns (`reply_to_message_id`, `deleted_at`, `edited_at`). Long-press primitive on the bubble is shared by Delete and Edit. **Re-evaluate TD-12 / TD-13 before opening C** — duplicate `SendMessageUseCase` flavors and the `MessagesModule ↔ DirectMessagesModule` cycle both get worse if not addressed first; TD-12 already flags edit as a blocker.

- [ ] C1 — **API**: migration on `messages` + DM messages table adds `reply_to_message_id` (nullable self-FK) + `deleted_at` (nullable) + `edited_at` (nullable).
- [ ] C2 — **API**: both `SendMessageUseCase` flavors accept `replyToMessageId`; validate same conversation + not deleted.
- [ ] C3 — **API**: new `DeleteMessageUseCase` + `DeleteDirectMessageUseCase`. Authz — DM: own message only; group: own if regular member, any if `OWNER` or `ADMIN`. Soft delete sets `deleted_at`.
- [ ] C4 — **API**: `DELETE /messages/:id` + DM counterpart, emit `message_deleted` over WS.
- [ ] C5 — **API**: group WS send + DM HTTP+WS send payloads accept `replyToMessageId`.
- [ ] C6 — **Shared**: message types gain optional `replyTo: { id, snippet, authorId }` (denormalised so receivers don't refetch) + `deletedAt` + `editedAt`.
- [ ] C7 — **Mobile**: long-press on bubble → ActionSheet (Reply / Edit / Delete, each gated by per-action perms).
- [ ] C8 — **Mobile**: reply composer state — quoted preview above input, send carries `replyToMessageId`.
- [ ] C9 — **Mobile**: quoted preview rendered above replying bubble; tap → scroll to original.
- [ ] C10 — **Mobile**: tombstone bubble when `deletedAt` is set ("Mensagem apagada"). Tombstoned messages reject Reply/Edit/Delete actions and don't accept reactions (D constraint).
- [ ] C11 — **API**: new `EditMessageUseCase` + `EditDirectMessageUseCase`. Authz mirrors delete exactly — DM: own message only; group: own if regular member, any if `OWNER` or `ADMIN` *(per user instruction; revisit if moderator-edit feels off in practice)*. Updates `content`, sets `edited_at = now()`, rejects on `deleted_at IS NOT NULL`.
- [ ] C12 — **API**: `PATCH /messages/:id { content }` + DM counterpart, emit `message_edited { id, content, editedAt }` over WS so other clients can swap bubble content without refetch.
- [ ] C13 — **Mobile**: edit composer state — input pre-filled with the original content, "Editando…" hint above the input with a cancel `×`, send fires the edit mutation (not a new message); optimistic content swap on the existing bubble; rollback on failure.
- [ ] C14 — **Mobile**: bubble appends a small "editado" suffix when `editedAt` is set (after the timestamp, claude design assets confirm exact placement).

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

#### Cluster E · Send-failure + retry (mobile-mostly, universal)

Universal to DM + group chat. Today the optimistic message disappears on a rejected `useSendMessage` / `useSendDirectMessage` mutation and the user has no signal that the send failed or way to retry — claude design assets now cover the failed bubble state + retry affordance. Small surface, ships any time; a candidate to land **before** A because it's the most user-visible gap in the chat surface today.

- [ ] E1 — **Shared (if needed)**: confirm both `SendMessage` payloads already accept a stable `clientMessageId` for idempotent retry. If not, add it (minor bump) — the optimistic bubble and the server response must share the id so retry can replace the failed bubble in place. *(verify against current `useGroupChat` / `useDmChat` first — the optimistic path likely already carries this for dedup.)*
- [ ] E2 — **Mobile**: extend the optimistic message shape with `sendStatus: 'sending' | 'sent' | 'failed'`. *Naming note*: settle the union name during impl — overlaps with Cluster B's `status: 'sending' | 'sent' | 'read'` for DMs. Likely outcome: one `sendStatus` for delivery, separate `readStatus` for DM read-receipts. Failed is universal (DM + group); read is DM-only.
- [ ] E3 — **Mobile**: when the send mutation rejects (HTTP error, WS ack timeout, or explicit server error), mark the optimistic bubble `failed` instead of removing it from the React Query cache; keep it pinned to its original position in the list.
- [ ] E4 — **Mobile**: render the failed bubble per claude design assets — failure colour treatment, "Não enviada" / "Falha ao enviar" label, tappable retry icon.
- [ ] E5 — **Mobile**: tap retry → re-fire the same mutation with the same `clientMessageId` + content; flip the bubble back to `sending` while in flight; on success swap the failed bubble out for the server message (same id so the swap is automatic).
- [ ] E6 — **Mobile**: long-press on a failed bubble offers a "Descartar" / "Cancelar envio" action that removes it from the cache without retrying — for the case where the user no longer wants to send what they typed.

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
