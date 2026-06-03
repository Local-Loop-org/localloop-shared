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

**Phase 4 DM flow shipped end-to-end on mobile except for E2E.** DM-TASK-A through DM-TASK-H closed; S1/S2/S3 (API), M1, M2, M3 peer presence, M4 shipped on mobile; DM-exception-candidates contract + API live; Cluster A push tap routing/cleanup/dedup, payload metadata, and immediate per-chat digest replacement are implemented; Cluster B is fully closed (B6 bubble status icons render checkmark glyphs on own DM bubbles); Cluster C is **almost closed** — C1 + C2 + C3 + C4 + C5 + C6 + C10 (tombstone) + C11 + C12 + C13 all shipped on API + mobile; only C14 ("editado" suffix) remains. Cluster E is **almost closed** — E1 + E2 + E3 (15s send-timeout detection) + E4 (failed-bubble visual) + E5 (tap-retry handler) shipped on mobile; only E6 (long-press "Descartar") remains. **Open DM work**: M5 Maestro E2E; Phase 5 DM polish. **Other open work**: C14 + E6 (small mobile slices), Phase 3 Slice 3 message permissions (API enforcement + mobile gating), GroupMembersScreen redesign, Phase 3 Slice 2 media upload, HOME-12 Map, Phase 2 Redis cache.

---

## Last updated

> Keep only the 3 most recent entries here; archive older ones to [`history.md`](./history.md).

2026-06-01 — History tombstone durability fix on `fix/history-include-tombstones` (API + shared docs). **Problem**: C6/PR #29 surfaced `isDeleted` on every message payload and C10 renders the "Mensagem apagada" tombstone, but `listByGroup` + `listConversation` still carried `.andWhere('m.is_deleted = false')` (the same filter the C3+C4 entry leaned on with "deleted messages drop out of the next GET …"). A soft-deleted message therefore became a tombstone only via the live `MESSAGE_DELETED` / `DIRECT_MESSAGE_DELETED` WS event — it vanished entirely on history reload or pagination, so C10 was not durable. **Fix (API)**: dropped the `is_deleted = false` filter from both history list queries so soft-deleted rows are returned in `created_at` order and keep their page slot (cursor pagination is now stable across deletes instead of silently shrinking pages). To avoid shipping deleted content over the wire, `rowToMessage` / `rowToDm` now null `content` + `mediaUrl` + `mediaType` whenever `is_deleted` is true — mirroring the deleted-reply-parent handling (`snippet: null`) already in those mappers and the mobile delete helpers that blank `content`. **Left filtering deleted on purpose**: the `markAsDeleted` / `markAsEdited` idempotency guards, the `getConversationReadState` thread-existence probe (+ its SQL assertion), and the group/DM inbox last-message previews. No migration; no shared-types change (`ChatMessage.content` is already `string | null`, `isDeleted` already present). Tests: 60 suites / 422 — added tombstone-forwarding cases to both history use-case specs plus repo mapping specs proving a deleted row maps to `isDeleted: true` with nulled content/media (new `message.typeorm.repository.spec.ts`, the group repo's first unit spec). Verification gap: no local Postgres, so the changed SQL was not exercised against a real DB before merge (same caveat as C1–C6).

2026-06-01 — Cluster E5 shipped on `feat/chat-tap-retry` (mobile, PR #34). **Mobile**: new `retrySendMessage(messageId)` on `useGroupChat` + `useDmChat`. Preconditions (temp exists, is a temp, `getLocalSendStatus(temp) === 'error'`); flips the temp's `sendStatus` back to `'sending'` via a new `markTempAsSending` sibling helper in `sendStatusTracker.ts` (shared private body with `markTempAsError`); re-emits `SEND_MESSAGE` / `SEND_DM` with the temp's original `clientMessageId` / `content` / `replyToMessageId` / media fields; **re-arms the 15s tracker** so a failed retry flips back to `'error'`. On success, the existing `clientMessageId`-based echo reconciliation in `upsertIncomingMessage` swaps the temp out in place. `onPressRetry` threaded through `GroupChatLayoutProps` and `DmChatLayoutProps` to `ChatThread.onPressRetry` → `OwnBubble.onRetry`; `FailedMessageRow` ("Não enviada" + "Tentar de novo") and `FailedMessageWarning` icon were already wired in E4 but unreachable until this PR closed the prop chain. No API / shared-types change. Persisted duplicate-safe idempotency inherits the E1 deferral (a retry after a false-positive failure could persist a duplicate). Tests: 105/105 across the 6 affected suites (new `retrySendMessage` block + helper). **Cluster E now reduces to E6 only** (long-press "Descartar / Cancelar envio" action). C10 + E3 + E4 also marked closed in the same doc update — all three landed on `feat/deleted-message-tombstone` via PR #32 + PR #33.

2026-05-30 — Cluster E2 shipped on `feat/chat-send-status` (mobile + shared docs). **Mobile**: optimistic group + DM temp messages now carry local-only `sendStatus: 'sending'`; status derivation can read local `sendStatus` from temp messages and fall back to `sending` when absent. Group own-message status maps now allow `error` in addition to `sending`/`sent`; DM read-state maps continue to return `sending`/`sent`/`read` and can now surface local temp `error`. No API/shared-types wire change — `DirectMessageStatus` already included `error`, and `sendStatus` stays mobile-only in the React Query cache. **Docs**: E1 closed as "stable `clientMessageId` echo confirmed; persisted duplicate-safe idempotency deferred"; E2 closed as model-only. E3-E6 still own failure detection, visible retry, retry execution, and discard/cancel.

---

## In progress

DM flow's last open task is **M5 Maestro E2E** (zero `.yaml` flows in the mobile repo). Once that lands the DM track closes apart from Phase 5 polish. Cluster E send-failure + retry is now live end-to-end for the happy path: E3's 15s setTimeout flips a stuck temp to `'error'`; E4 renders the failed-bubble treatment + retry affordance; E5 (PR #34) wires the tap handler that re-emits with the same `clientMessageId` and re-arms the tracker. Only **E6** (long-press "Descartar / Cancelar envio") remains in the cluster. Cluster C API side is **complete end-to-end through C12** and the mobile side now also carries C10 (tombstone bubbles) + C13 (edit composer); only C14 ("editado" suffix) remains. Phase 3 Slice 3 message permissions also mid-flight: shared enum published (step 1/3); API migration + `SendMessageUseCase` enforcement (step 2/3) and mobile composer gating (step 3/3) remain. Other candidates: GroupMembersScreen redesign, HOME-12 Map, Phase 3 Slice 2 media upload, Phase 2 Redis cache.

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

- `useDmPresence(peerId)` shipped by B4: mobile subscribes to `watch_dm_presence`, consumes `dm_presence_update`, and feeds the existing `peerStatus` prop on `DmChatLayout` so the header dot lights up.
- Push tap routing is closed by Cluster A on `feat/push-tap-routing`: mobile registers a single response listener, handles cold-start responses, routes group/DM payloads, dismisses matching presented notifications on chat mount, and suppresses foreground duplicates.
- `useDmInboxRealtime` is already wired in `InboxScreen` and refreshes the conversations cache from `dm_summary_update`, so the realtime half of the original M3 is done.

#### M5 · Maestro E2E

No Maestro flows exist in the mobile repo yet — see the Phase 4 block in [`testing-backlog.md`](./testing-backlog.md).

**Open decisions**

- Exception-list size cap: not enforced today. Revisit only if a user accumulates an unreasonable list (UX or storage cost).

### Chat features batch — Clusters A–E

Planned next. Five clusters grouping eight new mobile asks (reply, push grouping, push cleanup, DM read receipts, reactions, delete on long-press, **edit on long-press**, **failed-send + retry**) with already-tracked work (`useDmPresence(peerId)`; M3 push tap routing is now closed by A1). Suggested ship order **E → A → B → C → D**: A1–A5 + B1–B6 closed; C1–C9 + C11–C13 closed; E1/E2 closed (client id echo + status model), with failure production/retry still pending in E3-E6; A6/A7 (avatar rendering) blocked on native infra; C10/C14 + D1–D8 pending. Tasks that hit blockers drop to [`backlog.md`](./backlog.md).

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
- [x] B2 — **Shared + API**: `@localloop/shared-types@2.3.0` adds `dm_read_receipt`; API emits it over WS when a participant calls `POST /dm/:peerId/read` or sends `mark_dm_read`. `new_direct_message` remains the persisted "sent" signal.
- [x] B3 — **Shared**: `@localloop/shared-types@2.4.0` adds `DirectMessageStatus`, `DirectMessageWithStatus`, and `DirectMessageHistoryResponse`; status is derived client-side from optimistic state + `peerLastReadAt`, with no API `status` wire field.
- [x] B4 — **Shared + API + Mobile**: `useDmPresence(peerId)` hook → header dot in `DmChatLayout`; API provides read-only `watch_dm_presence` / `dm_presence_update`. *(was Phase 4)*
- [x] B5 — **Mobile**: `useDmReadState(peerId)` hook → bubble checkmark state.
- [x] B6 — **Mobile**: `DmMessageBubble` renders status icon per claude design assets. Shipped end-to-end on `feat/dm-redesign-components` (rendering) + `feat/group-bubble-send-status` (doc close-out + bubble-level rendering tests).

#### Cluster C · Message lifecycle: reply + delete + edit (full-stack)

C1 + C2 shipped on `feat/message-reply-edit-columns`. The schema migration covers two new columns (`reply_to_message_id`, `edited_at`); soft-delete continues to use the pre-existing `is_deleted BOOLEAN` flag — `deleted_at` was intentionally not added during C1 (decision noted in the 2026-05-28 entry above). Long-press primitive on the bubble is shared by Delete and Edit. **Re-evaluate TD-12 before opening C3+** — duplicate `SendMessageUseCase` flavors still block media/edit work if left unaddressed. TD-13 is closed: realtime wiring now lives behind `RealtimeModule` and `RealtimeEventsModule`.

- [x] C1 — **API**: migration `1717300000000-AddMessageReplyAndEditedColumns` adds `reply_to_message_id` (nullable self-FK, `ON DELETE SET NULL`) + `edited_at` (nullable `TIMESTAMPTZ`) to `messages` and `direct_messages`. `deleted_at` was dropped from scope in favour of the existing `is_deleted` boolean.
- [x] C2 — **API**: `SendMessageDto` + `SendDirectMessageDto` accept optional `replyToMessageId`; both `SendMessage` use cases validate parent against same-conversation + not-deleted before persisting. Error codes: `REPLY_TARGET_NOT_FOUND` (404), `REPLY_TARGET_WRONG_CONVERSATION` (400), `REPLY_TARGET_DELETED` (400). Adds `findById(id): Promise<Message | null>` to both repo interfaces.
- [x] C3 — **API**: new `DeleteMessageUseCase` + `DeleteDirectMessageUseCase`. Authz — DM: own message only (403 `NOT_MESSAGE_OWNER`); group: must be ACTIVE member, own if regular `MEMBER`, any if `OWNER` or `MODERATOR` (403 `NOT_ALLOWED` otherwise). Soft delete sets `is_deleted = true` via new idempotent `markAsDeleted(id)` on both repository interfaces. 404 `MESSAGE_NOT_FOUND` covers both missing and already-deleted rows.
- [x] C4 — **API**: top-level `DELETE /messages/:messageId` lives on a new `MessageItemController` (`MessagesController` is scoped to `groups/:id/messages`, so a sibling was needed); DM counterpart `DELETE /dm/messages/:messageId` lives on `DirectMessagesController` (placed before `:userId` routes so the literal `messages` segment isn't UUID-parsed). Both controllers emit through `RealtimeEventsService` → `DirectMessageRealtimeEventHandler` → new `ChatGateway.emitMessageDeleted` / `emitDirectMessageDeleted` wrappers → new `GroupMessageRealtimeService.emitMessageDeleted` / `DmMessageRealtimeService.emitDirectMessageDeleted` broadcasting to `groupRoom(groupId)` / `dmRoom(senderId, recipientId)`. `MessagesModule` now imports `RealtimeEventsModule`. The handler switch in `DirectMessageRealtimeEventHandler` now also routes the new group event — name is misleading, rename deferred.
- [x] C5 — **API**: group WS send + DM HTTP+WS send payloads accept `replyToMessageId`. HTTP DM was already free (controller forwards the validated `SendDirectMessageDto`; global `ValidationPipe({ whitelist: true })` keeps the field after C2). Group WS `send_message` and DM WS `send_dm` now extend `SendMessagePayload` / `SendDmPayload` with optional `replyToMessageId` and forward it from `GroupMessageRealtimeService.sendGroupMessage` / `DmMessageRealtimeService.sendDm` into the C2 use cases. No shared-types bump — payload types stay API-local, mobile updates its own types in C7/C8.
- [x] C6 — **Shared + API**: `@localloop/shared-types@2.8.0` extends `ChatMessage` with `replyTo: { id, authorId, snippet, isDeleted } | null`, `isDeleted: boolean`, `editedAt: string | null` (new `ChatMessageReplyTo` interface). API exposes the fields on every outbound message payload (`NEW_MESSAGE`, `NEW_DIRECT_MESSAGE`, `GET /groups/:id/messages`, `GET /dm/:peerId`, `POST /dm/:userId`). Denormalisation is read-time `LEFT JOIN` in `baseQuery()` (parent message + sender), mirroring the existing sender denormalisation; snippet truncated to 117 chars + `…`; deleted parents return `snippet: null` + `isDeleted: true`. `Message` and `DirectMessage` domain entities converted to object-literal constructors and gain `replyToMessageId: string | null` + `editedAt: Date | null`. The `replyTo` projection lives on `MessageRow`/`DirectMessageRow` + response DTOs, not on the domain entity.
- [x] C7 — **Mobile**: long-press on bubble → ActionSheet (Reply / Edit / Delete, each gated by per-action perms).
- [x] C8 — **Mobile**: reply composer state — quoted preview above input, send carries `replyToMessageId`.
- [x] C9 — **Mobile**: quoted preview rendered above replying bubble; tap → scroll to original.
- [x] C10 — **Mobile**: tombstone bubble when `isDeleted` is true ("Mensagem apagada"). Tombstoned messages reject Reply/Edit/Delete actions and don't accept reactions (D constraint). API history now returns soft-deleted rows as durable tombstones (content/media stripped) — the `is_deleted = false` filter on `listByGroup` / `listConversation` was removed on `fix/history-include-tombstones`, so the bubble survives reload/pagination instead of only live WS deletes.
- [x] C11 — **API**: new `EditMessageUseCase` + `EditDirectMessageUseCase`. **Author-only in both groups and DMs** — moderators / owners keep delete authz over other users' messages but can no longer edit them. Groups still require an `ACTIVE` membership precondition (mirrors delete). Error matrix: 404 `MESSAGE_NOT_FOUND` (missing or already soft-deleted); 403 `FORBIDDEN` (non-ACTIVE group member); 403 `NOT_MESSAGE_OWNER` (not the author — covers OWNER / MODERATOR attempts in groups); 400 `EMPTY_MESSAGE` (content trims to empty). No time-window limit. New idempotent `markAsEdited(id, content, editedAt)` on both repos uses the same `is_deleted = false` WHERE clause as `markAsDeleted`.
- [x] C12 — **Shared + API**: `@localloop/shared-types@2.10.0` adds `ChatSocketEvents.MESSAGE_EDITED` / `DIRECT_MESSAGE_EDITED` and `MessageEdited` / `DirectMessageEdited` payload types — full parity with `MessageDeleted` / `DirectMessageDeleted` plus `content`, `editedAt` (ISO string), and `editedBy`. New `PATCH /messages/:messageId` on `MessageItemController` and `PATCH /dm/messages/:messageId` on `DirectMessagesController` (placed before `:userId` routes); both wrap the C11 use cases, return the use-case DTO on 200, and emit `message_edited` / `direct_message_edited` over the existing bus → handler → gateway → service chain that C4 built. The bus event carries `Date editedAt`; the realtime services convert to ISO at the WS emit boundary. No module wiring changes — C11 already registered the use cases, C4 already wired `RealtimeEventsModule`.
- [x] C13 — **Mobile**: edit composer state — input pre-filled with the original content, "Editando…" hint above the input with a cancel `×`, send fires the edit mutation (not a new message); optimistic content swap on the existing bubble; rollback on failure.
- [x] C14 — **Mobile**: bubble appends a small "editado" suffix when `editedAt` is set (after the timestamp, claude design assets confirm exact placement).

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

- [x] E1 — **Shared (if needed)**: confirmed both group and DM WS send payloads already accept a stable `clientMessageId`, and mobile sends the optimistic temp id through so the server echo can replace the temp bubble in place. Persisted duplicate-safe idempotency is explicitly deferred; no shared-types bump.
- [x] E2 — **Mobile**: local-only optimistic send status model uses canonical `error` (`sending` / `sent` / `error`). Group + DM optimistic temp messages now initialize `sendStatus: 'sending'`; status derivation reads temp `sendStatus` when present, falls back to `sending`, and keeps persisted own messages mapped to `sent` / `read` as before. No API wire shape changes.
- [x] E3 — **Mobile**: when the send mutation rejects (HTTP error, WS ack timeout, or explicit server error), mark the optimistic bubble `error` instead of removing it from the React Query cache; keep it pinned to its original position in the list.
- [x] E4 — **Mobile**: render the error-state bubble per claude design assets — failure colour treatment, "Não enviada" / "Falha ao enviar" label, tappable retry icon.
- [x] E5 — **Mobile**: tap retry → re-fire the same mutation with the same `clientMessageId` + content; flip the bubble back to `sending` while in flight; on success swap the error-state bubble out for the server message (same id so the swap is automatic).
- [x] E6 — **Mobile**: long-press on an error-state bubble offers a "Descartar" / "Cancelar envio" action that removes it from the cache without retrying — for the case where the user no longer wants to send what they typed.

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
| TD-11 | API spec files duplicate repository mock builders — `buildGroupRepoMock` and `buildMessageRepoMock` extracted (done). Remaining: `IUserRepository` mock repeated across 7 specs in auth/user/messages modules → `src/modules/auth/test/user-repo.mock.ts`. | Test maintenance | Low |
| TD-12 | Messages module consolidation — group chat sends only via WebSocket, DM sends via HTTP+WebSocket. Nearly identical `SendMessageUseCase` logic, entity, and policy enforcement in two modules. Consolidate to single use case or add HTTP POST to group chat to make both symmetric. Blocks media-messaging and edit features if left unaddressed. | Phase 3 Slice 1 + Phase 4 DM API | Medium |

> Closed TD entries archived in [`done.md` § Closed technical debt](./done.md#closed-technical-debt).

---

## Known issues

No open known issues. Closed entries archived in [`done.md` § Closed known issues](./done.md#closed-known-issues).
