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

**Phase 4 DM flow shipped end-to-end on mobile except for E2E.** DM-TASK-A through DM-TASK-H closed; S1/S2/S3 (API), M1, M2, M3 peer presence, M4 shipped on mobile; DM-exception-candidates contract + API live; Cluster A push tap routing/cleanup/dedup, payload metadata, and immediate per-chat digest replacement are implemented; Cluster B is fully closed (B6 bubble status icons render checkmark glyphs on own DM bubbles); Cluster C is mid-flight — C1 (reply/edited columns) + C2 (reply validation in both `SendMessage` use cases) + C3 (delete use cases) + C4 (HTTP `DELETE` + WS `message_deleted`/`direct_message_deleted` broadcast) + C5 (`replyToMessageId` forwarded through group + DM WS send handlers) + C6 (`replyTo` snippet + `isDeleted` + `editedAt` on all outbound message payloads via read-time `LEFT JOIN`) shipped on the API. Group chat now also renders `sending`/`sent` indicators on own bubbles (subset of Cluster E — `error`/retry still pending). **Open DM work**: M5 Maestro E2E; Phase 5 DM polish. **Other open work**: rest of Cluster C (C7–C14 — mobile long-press, reply composer, tombstone bubble, edit pathway), Phase 3 Slice 3 message permissions (API enforcement + mobile gating), GroupMembersScreen redesign, Phase 3 Slice 2 media upload, HOME-12 Map, Phase 2 Redis cache.

---

## Last updated

> Only the latest entries live here. Prior entries are archived in [`history.md`](./history.md).

2026-05-28 — Cluster C6 shipped on `feat/wire-reply-deleted-edited` (shared + API). **Shared** (`@localloop/shared-types@2.8.0`, PR #35): new `ChatMessageReplyTo { id, authorId, snippet, isDeleted }`; `ChatMessage` extended with `replyTo: ChatMessageReplyTo | null`, `isDeleted: boolean`, `editedAt: string | null`. `GroupMessage` and `DirectMessage` inherit; `DirectMessageWithStatus` + history response shapes unchanged. **API** (PR #29): every outbound message payload — `NEW_MESSAGE`, `NEW_DIRECT_MESSAGE`, `GET /groups/:id/messages`, `GET /dm/:peerId`, `POST /dm/:userId` response, and the accept-request response — now carries the three new fields. Denormalisation is **read-time `LEFT JOIN`** in `baseQuery()` on both `MessageTypeORMRepository` and `DirectMessageTypeORMRepository`, mirroring the existing `senderName`/`senderAvatarUrl` JOIN — no migration. The `acceptRequestAtomic` manual SELECT was extended to match. Snippet helper (inline private function per repo, mirrors the [notifications-digest convention](localloop-api/src/modules/notifications/application/use-cases/record-chat-notification-digest/record-chat-notification-digest.use-case.ts#L95-L100)) truncates to 117 chars + `…` and normalises whitespace. **Deleted parents**: when the parent is `is_deleted = true`, `snippet` is `null` and `replyTo.isDeleted` is `true` — distinguishes a tombstone (render "Deleted message") from a media-only parent (snippet null, isDeleted false). Only possible for parents deleted *after* a child reply was sent; C2 already rejects replies to already-deleted parents. **Domain entity refactor bundled**: `Message` + `DirectMessage` converted from positional to object-literal constructors (`MessageProps` / `DirectMessageProps`), gaining `replyToMessageId: string | null` + `editedAt: Date | null` as persisted-column fields. The `replyTo` projection lives on `MessageRow` / `DirectMessageRow` + the response DTOs, not on the domain entity (it's a denormalised read-time projection). **Decisions taken**: read-time JOIN over send-time snapshot (consistent with the sender pattern, no migration, stays fresh after edits land in C11+); `replyTo.isDeleted` explicit flag (unambiguous mobile rendering); shared-types extension on the base `ChatMessage` (all variants inherit, callers unaffected). Tests: 57 suites, **390 tests** (+2: replyTo forwarding cases on group + DM send use cases, including the tombstoned-parent shape). Verification gap (same as C1–C5): no local Postgres at merge time, so the new `LEFT JOIN` was not exercised against a real DB before merge — Docker Desktop installed locally today, so future PRs can close this gap.

2026-05-28 — Cluster C5 shipped on `feat/ws-send-reply-passthrough` (API only). HTTP DM `POST /dm/:userId` was already free: the controller forwards the validated `SendDirectMessageDto` unchanged and `@IsOptional() @IsUUID()` on the DTO field (from C2) means the global `ValidationPipe({ whitelist: true })` keeps `replyToMessageId` across the boundary. Both WS handlers were the gap — they consume plain TypeScript interfaces (`SendMessagePayload`, `SendDmPayload`), not class-validated DTOs, so the pipe never runs there; both services were explicitly destructuring `{ content }` into the third arg of `SendMessageUseCase.execute` / `SendDirectMessageUseCase.execute`, dropping any reply id sent by the client. Adds `replyToMessageId?: string` to both interfaces in `realtime.types.ts` and forwards the field from `GroupMessageRealtimeService.sendGroupMessage` and `DmMessageRealtimeService.sendDm`. The use cases (from C2) own parent validation (`REPLY_TARGET_NOT_FOUND` 404, `REPLY_TARGET_WRONG_CONVERSATION` 400, `REPLY_TARGET_DELETED` 400); the existing `catch` blocks already surface those as `ChatSocketEvents.ERROR` payloads with `code` / `message`, so no new error-path code was needed. **Decisions taken (in PR #28)**: no shared-types bump — `SendMessagePayload` / `SendDmPayload` stay API-local, matching the C1+C2 pattern; mobile will add `replyToMessageId` to its own WS payload types when C7/C8 ship. No WS-layer `ValidationPipe` — adding class-validator to `@MessageBody()` is a wider defense-in-depth refactor across 6+ handlers; tracked as future TD. No HTTP controller-level reply test — the controller is a one-liner pass-through and the use-case spec already pins the validation matrix. Tests: 57 suites, **388 tests** (+2: one passthrough test per WS transport in `chat.gateway.spec.ts`). Verification gap (same as C1–C4): no local Postgres, so the new wire was not exercised against a real DB before merge.

2026-05-28 — Cluster C3 + C4 shipped on `feat/message-delete` (shared-types + API). **Shared**: `@localloop/shared-types@2.7.0` (2.6.0 was already taken by the chat-message-contracts refactor) adds `ChatSocketEvents.MESSAGE_DELETED` / `DIRECT_MESSAGE_DELETED` plus the `MessageDeleted { messageId, groupId, deletedBy }` and `DirectMessageDeleted { messageId, senderId, recipientId, deletedBy }` payload types. **API — C3**: new `DeleteMessageUseCase` (groups) and `DeleteDirectMessageUseCase` (DMs). Authz — DM: caller must be the sender (403 `NOT_MESSAGE_OWNER`); group: caller must be an `ACTIVE` member (403 `FORBIDDEN`) and must be either the author or hold `OWNER`/`MODERATOR` role (403 `NOT_ALLOWED`). The doc's earlier "OWNER or ADMIN" wording was a naming slip — the actual enum is `MemberRole.MODERATOR`. Soft delete sets `is_deleted = true` via the existing flag (no new column — decision recorded in the C1 entry). Both repos get a new idempotent `markAsDeleted(id)` that updates only when `is_deleted = false`. Returns 404 `MESSAGE_NOT_FOUND` both when the row is missing and when it is already deleted. **API — C4**: new top-level `MessageItemController` exposes `DELETE /messages/:messageId` (the existing `MessagesController` is scoped to `groups/:id/messages`, so a sibling controller was needed). `DirectMessagesController` gains `DELETE /dm/messages/:messageId`, placed before the `:userId` routes so the literal `messages` segment is never UUID-parsed. Both routes emit through the existing `RealtimeEventsService` bus → `DirectMessageRealtimeEventHandler` (now also handles the two new group/DM event types — handler is now misnamed; rename deferred). The handler delegates to new `ChatGateway.emitMessageDeleted` / `emitDirectMessageDeleted` wrappers, which in turn call the new `GroupMessageRealtimeService.emitMessageDeleted` and `DmMessageRealtimeService.emitDirectMessageDeleted` methods — both broadcast to the existing `groupRoom(groupId)` / `dmRoom(senderId, recipientId)` rooms so subscribers receive the event the same way they receive `new_message` / `new_direct_message` today. Existing list/read queries already filter `is_deleted = false`, so deleted messages drop out of the next `GET /groups/:id/messages` and `GET /dm/:peerId` calls without further changes. `MessagesModule` now imports `RealtimeEventsModule` (previously absent) so the new controller can emit. Tests: 57 suites, 386 tests (+12: 8 for `DeleteMessageUseCase`, 4 for `DeleteDirectMessageUseCase`, 2 for handler routing). Verification gap (same as C1/C2): no local Postgres, so the new `markAsDeleted` SQL was not exercised against a real DB before merge.

2026-05-28 — Cluster C1 + C2 shipped on `feat/message-reply-edit-columns` (API only). **C1**: migration `1717300000000-AddMessageReplyAndEditedColumns` adds nullable `reply_to_message_id UUID` (self-FK, `ON DELETE SET NULL`) and `edited_at TIMESTAMPTZ` to both `messages` and `direct_messages`. **`deleted_at` was intentionally not added** — both tables already have `is_deleted BOOLEAN DEFAULT false` and we kept that as the single soft-delete signal; downstream Cluster C wording updated to use `isDeleted`. ORM entities (`MessageOrmEntity`, `DirectMessageOrmEntity`) carry the new columns; domain entities + mappers untouched (C5/C6 will surface them on the wire). No `@ManyToOne` on the reply column to keep the navigation property out and force future devs to consume the denormalised snippet planned in C6. **C2**: `SendMessageDto` and `SendDirectMessageDto` gain optional `replyToMessageId`; both `SendMessageUseCase` and `SendDirectMessageUseCase` validate the parent before persisting — 404 `REPLY_TARGET_NOT_FOUND`, 400 `REPLY_TARGET_WRONG_CONVERSATION` (group: different group; DM: unordered participant pair mismatch — Bob → Alice can reply to Alice's earlier message to Bob), 400 `REPLY_TARGET_DELETED`. Validation runs after auth so parent existence doesn't leak. New lean `findById(id): Promise<Message | null>` on both repository interfaces + TypeORM impls; persisted via `CreateMessageData` / `CreateDirectMessageData` (no domain entity churn). Tests: 55 suites, 372 tests (+8: 4 group + 4 DM). Verification gap: no local Postgres on the dev machine, so the migration SQL + new `findById` queries were not exercised against a real DB before merge — flagged in PR #26.

2026-05-28 — B6 closed + group bubble send-status shipped on `feat/group-bubble-send-status` (mobile + shared docs). **B6**: the DM bubble status pipeline (hook → layout → `ChatThread` → `OwnBubble` → `MessageStatusIndicator`) was already wired end-to-end in commits 4608143/eb10e59/3579f3a; only the doc needed closing. **Groups**: `useGroupChat` now also derives `messageStatuses: Record<id, 'sending' | 'sent'>` (temp id prefix → `'sending'`, persisted own messages → `'sent'`); `GroupChatLayoutProps` gains `messageStatuses` and forwards into `ChatThread`. No shared-types bump — status stays mobile-derived, same as B3 decided for DM. Tests: bubble-level rendering proofs (each glyph) added under `Bubble.test.tsx`; hook-level derivation + reconciliation tests added under `useGroupChat.test.ts` (404/404 pass). `MessageStatusIndicator` got `testID="own-status-sent"`/`own-status-read"` for assertion access (no logic change). The `'error'` half of group bubble status — failed sends + retry — stays deferred to Cluster E.

---

## In progress

DM flow's last open task is **M5 Maestro E2E** (zero `.yaml` flows in the mobile repo). Once that lands the DM track closes apart from Phase 5 polish. Group chat now also renders `sending`/`sent` status icons on own bubbles; the `'error'`/retry half is deferred to Cluster E. Cluster C API side is now complete through C6 — C1+C2 (reply columns + send-time reply validation), C3+C4 (soft-delete use cases + HTTP/WS), C5 (`replyToMessageId` passthrough on group + DM WS send), and C6 (`replyTo`/`isDeleted`/`editedAt` exposed on all outbound message payloads) all shipped. Open: C7–C10 (mobile long-press, reply composer, quoted preview, tombstone bubble), C11–C14 (edit — API endpoint + WS event + mobile composer + "editado" suffix). Phase 3 Slice 3 message permissions also mid-flight: shared enum published (step 1/3); API migration + `SendMessageUseCase` enforcement (step 2/3) and mobile composer gating (step 3/3) remain. Other candidates: GroupMembersScreen redesign, HOME-12 Map, Phase 3 Slice 2 media upload, Phase 2 Redis cache.

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

Planned next. Five clusters grouping eight new mobile asks (reply, push grouping, push cleanup, DM read receipts, reactions, delete on long-press, **edit on long-press**, **failed-send + retry**) with already-tracked work (`useDmPresence(peerId)`; M3 push tap routing is now closed by A1). Suggested ship order **E → A → B → C → D**: A1–A5 + B1–B6 closed; C1 + C2 closed (API reply schema + use-case validation); E partial (sending/sent half wired, failed/retry pending); A6/A7 (avatar rendering) blocked on native infra; C3–C14 + D1–D8 pending. Tasks that hit blockers drop to [`backlog.md`](./backlog.md).

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
- [ ] C7 — **Mobile**: long-press on bubble → ActionSheet (Reply / Edit / Delete, each gated by per-action perms).
- [ ] C8 — **Mobile**: reply composer state — quoted preview above input, send carries `replyToMessageId`.
- [ ] C9 — **Mobile**: quoted preview rendered above replying bubble; tap → scroll to original.
- [ ] C10 — **Mobile**: tombstone bubble when `isDeleted` is true ("Mensagem apagada"). Tombstoned messages reject Reply/Edit/Delete actions and don't accept reactions (D constraint).
- [ ] C11 — **API**: new `EditMessageUseCase` + `EditDirectMessageUseCase`. Authz mirrors delete exactly — DM: own message only; group: own if regular member, any if `OWNER` or `MODERATOR` *(per user instruction; revisit if moderator-edit feels off in practice)*. Updates `content`, sets `edited_at = now()`, rejects when `is_deleted = true`.
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
- [~] E2 — **Mobile**: extend the optimistic message shape with `sendStatus: 'sending' | 'sent' | 'failed'`. *Naming note*: settle the union name during impl — overlaps with Cluster B's `status: 'sending' | 'sent' | 'read'` for DMs. Likely outcome: one `sendStatus` for delivery, separate `readStatus` for DM read-receipts. Failed is universal (DM + group); read is DM-only. **Partial**: `sending`/`sent` half is already wired for both DM (via `useDmReadState`) and group (via `useGroupChat.messageStatuses` on `feat/group-bubble-send-status`). E2 remaining work is just the `failed` state — which is gated on E1 (`clientMessageId`) and a real failure signal.
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

> Closed TD entries archived in [`done.md` § Closed technical debt](./done.md#closed-technical-debt).

---

## Known issues

No open known issues. Closed entries archived in [`done.md` § Closed known issues](./done.md#closed-known-issues).
