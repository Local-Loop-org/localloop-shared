# Project Status

> Keep this file updated at the end of every session.
> This is the first file any agent reads to understand where the project is.

---

## Current phase

**Phase 4 DM flow alignment — DM-TASK-A + DM-TASK-B + DM-TASK-C + DM-TASK-D + DM-TASK-E closed**. Task A made direct delivery atomic (`createDirectDeliveryAtomic` wraps the `direct_messages` insert + idempotent `dm_permission_exceptions` UPSERT + idempotent sender-side `dm_conversation_state` init in one tx; request route untouched). Task B made `ChatGateway.onSendDm` branch on `result.type` — `message` keeps the room broadcast, `request` emits the new `dm_request_sent { requestId }` event to the sender's own socket only (no cross-leak into the dm room). Task C added `POST /dm/requests/:id/accept` + `POST /dm/requests/:id/decline`: accept materializes the held message into `direct_messages` (preserving original `created_at`), writes the recipient→sender permission exception, eager-inits sender-side conversation state, deletes the request row — all in one tx — and emits `dm_request_accepted` to every connected socket of the original sender; decline is an idempotent DELETE. Non-recipients get 404 (existence hidden). `@localloop/shared-types@1.11.0` adds `DM_REQUEST_ACCEPTED`. Task D added the manual exception management trio (`GET /users/me/dm-exceptions` + `PUT/DELETE /users/me/dm-exceptions/:peerId`) — paginated list, idempotent UPSERT (self-pair → 400, missing/inactive peer → 404), idempotent DELETE — under a new `DmExceptionsController` in `DirectMessagesModule`. API-only, no shared bump. Task E closed the inbox liveness loop: new `dm_inbox:user:{userId}` rooms with `watch_dm_inbox`/`unwatch_dm_inbox`/`mark_dm_read` handlers, `dm_summary_update` emitted from every mutation (send direct-delivery, accept-request, mark-read, archive/unarchive), and `emitDmRequestAccepted` migrated off `fetchSockets()` iterate-and-filter onto the same room. Mobile now watches the DM inbox on focused Inbox and open DM chat sockets, marks open DMs read, consumes `dm_summary_update`, and exposes archive/unarchive from the DM chat header. **Still open under DM flow alignment**: Task F (DM push fan-out + WS dedup), Task G (deactivated-peer placeholder), Task H (DTO naming rename — breaking, cross-repo). Other open work: API-backed user listing/search for adding Profile DM exceptions, Phase 3 Slice 3 message permissions (mid-flight on shared + API), Phase 3 Slice 2 media upload, GroupMembersScreen mobile redesign, HOME-12 Map, Phase 2 Redis cache. HOME-8 search remains Phase 5 Polish; the no-op Home search icon stays hidden until the real search screen ships.

## Last updated

2026-05-20 — Mobile DM-TASK-E wiring shipped on `feat/dm-task-e-mobile` (mobile) + `docs/dm-task-e-mobile` (shared docs). **Mobile**: bumps `@localloop/shared-types` to `^1.12.0`; `dm.api.ts` adds `PUT /dm/:peerId/archive` + `DELETE /dm/:peerId/archive`; `useDmConversations` gains shared cache helpers for summary updates, mark-read, archive toggles, snapshots, rollback, and missing-peer invalidation. New hooks: `useDmInboxRealtime`, `useArchiveDmConversation`, `useUnarchiveDmConversation`. `InboxScreen` watches `dm_inbox:user:{userId}` while focused and passes `initialArchived` into `DmChat`. `useDmChat` now watches the DM inbox on its socket, emits `mark_dm_read`, handles `dm_request_sent` and `dm_request_accepted`, applies `dm_summary_update`, and clears unread caches optimistically. `DmChatScreen` adds a header overflow action for archive/unarchive with optimistic UI state and error alerts. Still deferred: API-backed user listing/search for adding Profile DM exceptions, DM push fan-out/routing, deactivated-peer placeholder, and DTO naming standardization. Verification: focused DM Jest set, `npx tsc --noEmit`, and full mobile Jest (`50/50` suites, `337/337` tests) pass.

2026-05-19 — DM-TASK-E shipped on `feat/dm-task-e` (shared + API). Closes Gap 6 + Gap 7 and migrates `dm_request_accepted` to the new per-user room model. **Shared**: `@localloop/shared-types@1.12.1` adds `MARK_DM_READ` / `WATCH_DM_INBOX` / `UNWATCH_DM_INBOX` / `DM_SUMMARY_UPDATE` to `ChatSocketEvents`, plus `DmLastMessage` + `DmSummaryUpdate` interfaces (exact mirror of `GroupSummaryUpdate` plus `archived`). **API**: `IDirectMessageRepository` gains `markRead`, `setArchived`, `getDmSummary`; `DmConversationRow` extended with `lastReadAt` (also projected by `listInbox` SQL); new `DmSummary` domain type mirrors `MyGroupSummary` (`peerId` instead of `groupId`, plus `archived`). Three new use cases (`MarkDmReadUseCase`, `ArchiveDmConversationUseCase`, `UnarchiveDmConversationUseCase`) — pure data mutations, none inject the gateway; all reject self-DM with `BadRequestException('DM_SELF_NOT_ALLOWED')`. `ChatGateway` introduces `dm_inbox:user:{userId}` rooms with `watch_dm_inbox`/`unwatch_dm_inbox`/`mark_dm_read` handlers, plus an `emitDmSummary(userId, peerId)` helper called from `onSendDm` direct-delivery (fired for both participants, fire-and-forget), the accept-request controller (after `emitDmRequestAccepted`, both participants), and the new archive endpoints. `emitDmRequestAccepted` migrated from `fetchSockets()` iterate-and-filter to room-based emit (`server.to(dmInboxRoom(senderId)).emit(...)`) — multi-device fan-out is now an implicit property of the room. New endpoints: `PUT /dm/:userId/archive` + `DELETE /dm/:userId/archive` (both 204, both fire `emitDmSummary` for the caller). API `package.json` bumps `@localloop/shared-types` to `^1.12.0`. Spec extended: 3 use case specs each for mark-read/archive/unarchive, 11 new gateway specs (`watch_dm_inbox` join + multi-device, `unwatch_dm_inbox` leave, `mark_dm_read` happy path + self-DM reject + missing peer + no-leak, `onSendDm` summary fan-out on direct delivery + no-emit on request branch, `emitDmSummary` null silence + Date→ISO serialization, four migrated `emitDmRequestAccepted` tests). TD-13 port extraction deferred to DM-TASK-F as the third datapoint. Verification: 47/47 suites, 292/292 tests (+34 new), lint + build clean.

2026-05-17 — Phase 4 S1 DM inbox API shipped on `feat/dm-inbox-api` ([api#23](https://github.com/Local-Loop-org/localloop-api/pull/23)). **API**: `GET /dm` derives inbox on the fly via `DISTINCT ON` over `direct_messages` + `LEFT JOIN dm_conversation_state`; returns peer summary, last message preview, unread count (from `last_read_at`), archived flag; cursor `(lastMessageAt, peerId)`. `GET /dm/requests` lists `dm_requests` rows addressed to the caller; cursor `(createdAt, requestId)`. `SendDirectMessageUseCase` reworked: checks `dm_permission_exceptions` first (always direct), then `EVERYONE` → direct, `MEMBERS` + shared group → direct, `MEMBERS` + no shared group → request, `NOBODY` → request; response is discriminated union `{ type: 'message' | 'request' }`. Migration `1717100000000-AddDmInboxSupport` adds three tables: `dm_requests` (UNIQUE sender+recipient — upsert keeps latest message), `dm_conversation_state` (PK user+peer, `last_read_at`, `archived`), `dm_permission_exceptions` (PK user+peer — written on request accept, deferred). `parseTimestampIdCursor(raw, tsField, idField)` extracted to `cursor.utils.ts`; `ListMyGroupsUseCase` migrated to use it. Verification: 39/39 suites, 242/242 tests (+19 new), lint + build clean.

2026-05-16 — Phase 4 DM API slice shipped on `feat/dm-api-slice` (shared + API). **Shared**: `@localloop/shared-types@1.9.0` adds the `DirectMessage` interface and four DM socket events (`JOIN_DM`, `LEAVE_DM`, `SEND_DM`, `NEW_DIRECT_MESSAGE`). **API**: migration `1717000000000-CreateDirectMessages` adds the `direct_messages` table (functional `idx_dm_conversation` index on `LEAST/GREATEST(sender, recipient), created_at DESC` + `chk_dm_distinct_participants` check). New `DirectMessagesModule` provides `SendDirectMessageUseCase` (enforces `dm_permission`: `NOBODY` → 403; `MEMBERS` → `IGroupRepository.hasSharedActiveGroup` check; `EVERYONE` → allow) and `GetDirectMessageHistoryUseCase` (cursor pagination, no policy check on read). HTTP: `POST /dm/:userId` and `GET /dm/:userId?limit&before`. WebSocket: `ChatGateway` extended with `join_dm`/`leave_dm`/`send_dm`; rooms are `dm:{sortedA}:{sortedB}` per `architecture.md`. Out of scope (deferred): DM push fan-out, media DMs (use case rejects non-null `mediaUrl`/`mediaType`). Verification: 36/36 suites, 223/223 tests (+22 new), lint + build clean.
**Phase 4 DM flow spec landed on `docs/direct-message-flow`** (shared docs only). The full DM contract — gate model (`dm_permission` + `dm_permission_exceptions`), request-routing, exception lifecycle, inbox/requests separation, WS events, deactivated peers, media-DM routing — now lives in `architecture.md` "Direct messages (Phase 4)" + ADR-006. Phase 4 DM API slice (`feat/dm-api-slice`) earlier shipped the schema + `Send`/`GetHistory` use cases + `GET`/`POST /dm/:userId` + WS `join_dm`/`leave_dm`/`send_dm`. The spec exposes 12 alignment gaps in the code — see "Up next → Phase 4 → DM flow alignment". Still open beyond DM: Phase 3 Slice 3 message permissions (mid-flight on shared + API), Phase 3 Slice 2 media upload, the GroupMembersScreen mobile redesign, HOME-12 Map, and Phase 2 Redis cache. HOME-8 search remains Phase 5 Polish; the no-op Home search icon stays hidden until the real search screen ships.

## Last updated

2026-05-19 — DM-TASK-D shipped on `feat/dm-task-d` (API + shared docs). Closes Gap 3. **API-only — no shared-types version bump** (no exported types or WS events change). `IDirectMessageRepository` gains `listExceptions` (paginated `dm_permission_exceptions` × `users` JOIN, filters `is_active = true`, cursor `(createdAt, peerId) DESC`), `addException` (single-statement `INSERT … ON CONFLICT DO NOTHING`), and `removeException` (single-statement DELETE, idempotent). Three new use cases under `application/use-cases/{list,add,remove}-dm-exception/`: list reuses `parseTimestampIdCursor` + `encodeJsonCursor`; add validates self-pair (400 `CANNOT_EXCEPTION_SELF`) and peer existence/active (404 `PEER_NOT_FOUND`); remove validates self-pair only — no peer-existence check so cleanup of deactivated peers stays possible. New `DmExceptionsController` mounted at `users/me/dm-exceptions` (matching the URL convention used by NotificationsModule's `/users/me/push-permission`) exposes `GET` (paginated list), `PUT :peerId` (204), `DELETE :peerId` (204); all behind `AuthGuard('jwt')`. Wiring: `DirectMessagesModule` registers the trio of providers + the new controller; the existing forwardRef cycle with `MessagesModule` stays untouched (no gateway involvement in Task D). `buildDirectMessageRepoMock` extended with three jest.fn() entries. Verification: 44/44 suites, 272/272 tests (+14 new — 5 list, 5 add, 4 remove), lint + build clean.

2026-05-19 — DM-TASK-C shipped on `feat/dm-task-c` (shared + API). Closes Gap 2 and Gap 5. **Shared**: `@localloop/shared-types@1.11.0` adds `DM_REQUEST_ACCEPTED: 'dm_request_accepted'` to `ChatSocketEvents`. **API**: `IDirectMessageRepository` gains `findRequestById` (single-row lookup with auth-relevant fields), `acceptRequestAtomic` (one `dataSource.transaction`: `SELECT … FOR UPDATE` on `dm_requests`, INSERT into `direct_messages` preserving original `created_at`, `INSERT INTO dm_permission_exceptions (recipient → sender) ON CONFLICT DO NOTHING`, `INSERT INTO dm_conversation_state` for sender, DELETE `dm_requests`, JOIN sender display name), and `declineRequest` (idempotent DELETE). New `AcceptDmRequestUseCase` and `DeclineDmRequestUseCase` mirror `ResolveJoinRequestUseCase` (separate read + auth check, then atomic). Controller adds `POST /dm/requests/:requestId/accept` (200 with materialized message) and `POST /dm/requests/:requestId/decline` (204). Non-recipients receive 404 — existence hidden by design. `ChatGateway.emitDmRequestAccepted(senderId, payload)` iterates `server.fetchSockets()` and emits to every socket whose `socket.data.user.id === senderId`; recipient learns of the materialized message via the HTTP response, so no room broadcast. Wiring: `MessagesModule` ↔ `DirectMessagesModule` now cross-import via `forwardRef`; `MessagesModule` exports `ChatGateway` so the DM controller can inject it. API `package.json` bumps `@localloop/shared-types` to `^1.11.0`. Spec extended: 5 accept-use-case tests, 4 decline-use-case tests, 4 gateway tests (emit to sender, multi-device fan-out, no-leak to strangers/DM-room observers, no-op when sender offline). Verification: 41/41 suites, 258/258 tests (+13 new), lint + build clean.

2026-05-18 — DM-TASK-B shipped on `feat/dm-task-b` (shared) + `feat/dm-task-a` (API, same branch as Task A). Closes Gap 4. **Shared**: `@localloop/shared-types@1.10.0` adds `DM_REQUEST_SENT: 'dm_request_sent'` to `ChatSocketEvents`. **API**: `ChatGateway.onSendDm` now branches on `result.type` — `message` keeps the existing `new_direct_message` broadcast into `dm:{sortedA}:{sortedB}`; `request` emits `dm_request_sent { requestId }` to the sender's own socket only via `socket.emit`, no room broadcast. Recipient's room sockets no longer receive request-shaped payloads. API `package.json` bumps `@localloop/shared-types` to `^1.10.0`. Spec extended: message-branch test now asserts no self-leak of `dm_request_sent`; new request-branch test; new no-cross-leak test seeds an observer socket in the dm room and asserts it never receives the request payload. Multi-device sender caveat: other devices won't get `dm_request_sent` (will discover via `dm_summary_update` in DM-TASK-E). Verification: 245/245 tests (+3 new), lint + build clean.

2026-05-18 — DM-TASK-A shipped on `feat/dm-task-a` (API only). Closes Gap 1 and Gap 11. `SendDirectMessageUseCase`'s direct-delivery path now goes through a new `IDirectMessageRepository.createDirectDeliveryAtomic(data)` that wraps three writes in one `dataSource.transaction`: the `direct_messages` insert (via `manager.getRepository(...).save()`), an idempotent `INSERT INTO dm_permission_exceptions (user_id, allowed_peer_id) VALUES ($1, $2) ON CONFLICT DO NOTHING` (sender → recipient), and an idempotent `INSERT INTO dm_conversation_state (user_id, peer_id, last_read_at) VALUES ($1, $2, now()) ON CONFLICT DO NOTHING` (sender's row only — recipient's row stays lazy). The old standalone `create()` method was removed from the interface (only caller was the use case). Request route is untouched: `createRequest()` continues to UPSERT into `dm_requests` and neither side table is written. Side-table writes are idempotent so repeat sends are safe; transactional atomicity prevents orphaned state if any write fails mid-request. Spec extended: existing direct-delivery tests swap to the new method name; request-path tests gain an explicit `not.toHaveBeenCalled` assertion on `createDirectDeliveryAtomic`; new test exercises repeat-send idempotency. Verification: 243/243 tests (+1 new), lint + build clean.

2026-05-18 — Direct-message flow specified end-to-end on `docs/direct-message-flow` (shared docs only; no code changes). `architecture.md` gains a full "Direct messages (Phase 4)" section covering the gate model (`dm_permission` + `dm_permission_exceptions` as the source of truth), the request-routing table, the three exception-write paths (implicit on direct delivery, explicit on accept-request, manual via profile UI), read-side openness, inbox vs requests separation, `dm_conversation_state` lifecycle + `archive`-independent-of-`unread`, the full WS contract (`send_dm` branching on result type, `new_direct_message`, `dm_request_sent`, `dm_request_accepted`, `watch_dm_inbox`, `dm_summary_update`, `mark_dm_read`), deactivated-peer handling, media-DM routing (when shipped), multi-device dedup, display-name JOIN-at-read, and self-DM defense-in-depth. ADR-006 records the architectural shift from 403-blocked-DMs to the request-routing model. `api-contracts.md` updated: `POST /dm/:userId` returns a discriminated union (`{type:'message'} | {type:'request', requestId}`); new `GET /dm` (conversations) and `GET /dm/requests` (pending) endpoints; WS section adds the new events flagged `[PLANNED]`. `prd.md` Section 4 rewritten (pt-BR) for the new model. `data-model.md` adds `dm_requests`, `dm_conversation_state`, `dm_permission_exceptions`, plus migration entries for `1717000000000-CreateDirectMessages` and `1717100000000-AddDmInboxSupport`. The spec exposes **12 code gaps** added under "Up next → Phase 4 → DM flow alignment".

2026-05-16 — Phase 4 DM API slice shipped on `feat/dm-api-slice` (shared + API). **Shared**: `@localloop/shared-types@1.9.0` adds the `DirectMessage` interface and four DM socket events (`JOIN_DM`, `LEAVE_DM`, `SEND_DM`, `NEW_DIRECT_MESSAGE`). **API**: migration `1717000000000-CreateDirectMessages` adds the `direct_messages` table (functional `idx_dm_conversation` index on `LEAST/GREATEST(sender, recipient), created_at DESC` + `chk_dm_distinct_participants` check). New `DirectMessagesModule` provides `SendDirectMessageUseCase` (enforced `dm_permission` with `403 DM_NOT_ALLOWED` on violation in this slice; superseded by the request-routing model in commit `1ab8044`, see entry below) and `GetDirectMessageHistoryUseCase` (cursor pagination, no policy check on read). HTTP: `POST /dm/:userId` and `GET /dm/:userId?limit&before`. WebSocket: `ChatGateway` extended with `join_dm`/`leave_dm`/`send_dm`; rooms are `dm:{sortedA}:{sortedB}` per `architecture.md`. Verification: 36/36 suites, 223/223 tests (+22 new), lint + build clean.

2026-05-17 — DM request-routing + inbox/requests endpoints shipped in commit `1ab8044 feat(dm): add inbox list + request endpoints with permission-based routing` (API; no shared-types or dedicated branch entry recorded earlier). **Schema**: migration `1717100000000-AddDmInboxSupport` adds `dm_requests` (UPSERT on `(sender_id, recipient_id)` — one pending row per pair), `dm_conversation_state` (per-user `last_read_at` + `archived`), and `dm_permission_exceptions` (durable allow-list). **Use cases**: `SendDirectMessageUseCase` rewritten — instead of throwing `403 DM_NOT_ALLOWED`, it now branches via `routeDm()` and returns a discriminated union (`{type:'message'} | {type:'request', requestId}`). Adds `hasPermissionException` short-circuit. New `ListDmConversationsUseCase` (inbox) and `ListDmRequestsUseCase` (pending) with cursor pagination. **HTTP**: `GET /dm` (inbox) and `GET /dm/requests` added. The spec layer (ADR-006 + architecture.md "Direct messages") landed later on 2026-05-18 to formalize the model and enumerate the remaining gaps.

2026-05-16 — `MessagePermission` enum added to `@localloop/shared-types@1.8.0` on `feat/message-permission-enum` (shared only). First step of Phase 3 Slice 3. New values: `ADMIN_ONLY` (sender must be `OWNER` or `MODERATOR`), `MEMBERS_IN_RADIUS` (sender's geohash must overlap the group's anchor neighbors), `ALL_MEMBERS` (any active member). Pure contract change — no API or mobile wiring yet; the API migration (`send_text_perm` + `send_media_perm` on `groups`), `SendMessageUseCase` policy enforcement, and mobile composer gating + `CreateGroupScreen` selectors follow in their own slices once the package publishes. Verification: lint + build clean.

2026-05-16 — List-banned-members API shipped on `feat/list-banned-members` (API only; docs on `docs/list-banned-members` in shared). New endpoint `GET /groups/:id/members/banned` is paginated, OWNER- or MODERATOR-only, and returns the same `GroupMemberDto` shape as the active-members list. `ListBannedMembersUseCase` reuses the same `findById` → `NotFoundException` guard as `ListGroupMembersUseCase` but with the tighter auth shape used by ban/unban. The existing `listMembersPaginated` repo method gained a required `status: MemberStatus` parameter (replacing the hard-coded `ACTIVE` filter); the active-members use case now passes `MemberStatus.ACTIVE` explicitly. Pagination cursor is `joined_at` — there is no `banned_at` column today (out-of-scope follow-up). Verification: 201/201 tests (7 new), lint + build clean.

2026-05-16 — Member role-change API shipped on `feat/member-role-changes` (API only; docs bundled on the in-flight `docs/groups-moderation` branch in shared). Two new OWNER-only endpoints: `POST /groups/:id/members/:userId/promote` (MEMBER → MODERATOR) and `POST /groups/:id/members/:userId/demote` (MODERATOR → MEMBER). Authorization is intentionally tighter than ban/unban — moderators cannot change roles, which prevents moderator chain-promotion and demotion retaliation between mods. `PromoteMemberUseCase` and `DemoteMemberUseCase` share the same guard shape (caller must be active OWNER; target must exist, be active, and not be the OWNER) and diverge only on the current-role precondition (`ALREADY_MODERATOR` / `NOT_A_MODERATOR`). New `updateMemberRole(groupId, userId, role)` on `IGroupRepository` is a plain UPDATE — `memberCount` is unchanged. Verification: 194/194 tests (18 new), lint + build clean.

2026-05-15 — Unban member API endpoint shipped on `feat/unban-member-api` (API only; docs on `docs/groups-moderation` in shared). `POST /groups/:id/members/:userId/unban` lets an active OWNER or MODERATOR lift a ban. Implementation: `UnbanMemberUseCase` mirrors `BanMemberUseCase`'s authorization shape (caller must be active OWNER/MODERATOR) and adds a `TARGET_NOT_BANNED` (400) guard so the operation can only run on rows whose `status = 'banned'`. New `unbanMemberAtomic(groupId, userId)` on `IGroupRepository` hard-deletes the `group_members` row inside a transaction; `memberCount` is unchanged because BANNED rows are not counted. After unban the user is treated as a non-member: they can re-discover the group via `GET /groups/nearby` (which no longer filters them out) and request to join again as a regular member. Verification: 176/176 tests (8 new), lint + build clean. Mobile UI for the unban action is part of the upcoming `GroupMembersScreen` redesign; a `listBannedMembers` endpoint is the next API slice.

2026-05-14 — HOME-11 My Groups freshness implemented on `feat/home-11-summaries` (shared + API + mobile). **Shared**: `@localloop/shared-types@1.6.0` adds `MyGroup`, `MyGroupLastMessage`, and `GroupSummaryUpdate`. **API**: migration `1716100000000-AddGroupMemberLastReadAt` adds `group_members.last_read_at`; `GET /groups/me` now returns `lastReadAt` + persisted `unreadCount` while preserving `lastMessage`; `/chat` adds `watch_group_summaries`, `unwatch_group_summaries`, `mark_group_read`, and user-specific `group_summary_update` payloads. **Mobile**: My Groups queries are limit-specific but updated together by realtime events; Home and `MyGroupsScreen` reuse a shared `MyGroupRow`; the presence socket also watches group summaries, and open chats mark the group read.

2026-05-13 — Group-message push notification fan-out implemented on `feat/group-message-push` (API + docs). `ChatGateway` now emits `new_message` first, then best-effort sends Expo push notifications through the provider-neutral notification use case. Recipients are enabled push devices for active group members with `users.push_permission_status = 'granted'`, excluding the sender and sockets currently connected to `group:{groupId}`. Notification previews collapse whitespace, cap at 120 chars, and immediate Expo `DeviceNotRegistered` ticket errors disable the affected token. No mobile changes in this slice; tap-to-chat deep-linking remains deferred.

2026-05-13 — Phase 4 push notification initial setup implemented on `feat/push-notifications-setup` (shared + API + mobile). **Shared**: `@localloop/shared-types@1.5.0` adds `PushProvider`, `PushPermissionStatus`, `DevicePlatform`, and extends `UserSummary.pushPermissionStatus`. **API**: migration `1716000000000-AddPushNotifications` adds `users.push_permission_status` + `push_devices`; new `NotificationsModule` exposes `PUT /users/me/push-devices/current`, `DELETE /users/me/push-devices/current`, and `PATCH /users/me/push-permission`; Expo Push is implemented behind `IPushNotificationProvider` but not yet called by chat. **Mobile**: adds `expo-notifications` / `expo-constants`, stores a stable installation ID, bootstraps permission once from Home when status is `null`, moves later changes to the Profile notification toggle, and hides the no-op Home search icon. Message notification fan-out is next.

2026-05-13 — Location privacy rule clarified in `architecture.md`: user exact `lat/lng` remains private and is never returned to other users, but group anchor coordinates are public group metadata. Future Group Detail distance work should expose group anchor coordinates from the group detail API and compute the user's current distance locally on mobile using the existing `distanceMeters` helper + device coords.

2026-05-13 — Roadmap adjusted for the next Home/group-management passes. HOME-8 search is now Phase 5 Polish instead of a current blocker; next mobile work touching Home should hide the no-op search button until search is built. Added HOME-11: unread count + socket-fresh last message for `MyGroupRow`, shared between Home and `MyGroupsScreen`. Added GroupMembersScreen redesign + unban: active members, join requests for approval-required groups, and banned users as separate sections. Added HOME-12: real Map screen roadmap item. Added mobile polish item to use a members icon instead of the literal `MEM` shorthand.

2026-05-12 — HOME-5 live presence on Home implemented across API + mobile + shared docs on `feat/home-5-presence`. **API**: `/chat` adds `watch_presence` / `unwatch_presence`; observer sockets join `presence:{groupId}` rooms, while only chat sockets in `group:{groupId}` are counted. `emitPresence` broadcasts the same `presence_update` to both room types. Authorization: open groups are watchable by authenticated users; approval-required groups are watchable only by ACTIVE members; missing/inactive/banned/closed non-member groups are suppressed. **Mobile**: new `useGroupPresence(groupIds)` hook opens a read-only socket subscription; `HomeScreen` watches visible eligible nearby groups plus "Meus grupos" and merges live counts into presentational props. UI renders green dot on my-groups rows, compact live count pill on horizontal discovery cards, and green `N Online` suffix on vertical discovery rows. **Docs**: `api-contracts.md` documents the new WebSocket events. Verification: API 147/147 tests + build; mobile 221/221 tests + `tsc --noEmit`; shared lint clean.

2026-05-11 — GroupDetailScreen G2 redesign + full RQ migration + inline editing merged (mobile + API). **API**: `UpdateGroupUseCase` + `PATCH /groups/:id` — owner or moderator can partially update `name`, `description`, `anchorLabel`, `privacy`, `radiusKm`; returns `GroupDetailDto`. **Mobile — G2 redesign**: Hero card retains cyan/lavender gradient with glow orb; `MemberStack` border fixed (moved from wrapper `View` to `LinearGradient` so the 2px ring is no longer hidden by Yoga overflow); `MembersSection` replaced from an avatar stack to a row list — `MemberAvatar` (36px gradient circle), display name, `RolePill`; "…" action button per row expands a drawer with "Promover a admin" (MEMBER rows only) and "Banir do grupo"; inset divider between rows. **Mobile — RQ migration**: `GroupDetailScreen` is now fully React Query — `useGroupDetail` (`useQuery`), `useGroupJoinRequests` (`useQuery`, privileged only), `useGroupMembers` (`useQuery`, limit 5), `useLeaveGroup` / `useDeleteGroup` / `useBanMember` / `useResolveJoinRequest` / `useUpdateGroup` (all `useMutation` with optimistic updates + rollback). `confirmDestructive` helper for leave/delete confirm dialogs. Leave now navigates to Home (not `goBack`). **Mobile — inline edit**: pencil icon in `HeaderBar` (owners/moderators only) → edit mode; Hero name/description become `TextInput`; `LocationSection` gains `typeReadOnly` prop (locks type chips, keeps label editable); `PrivacySection` and `VisibilitySection` become interactive; Cancelar/Salvar in header; spinner while saving. 214/214 tests, typecheck clean.

2026-05-10 — HOME-9 and HOME-10 both fully merged on API + mobile. **HOME-9**: `feat/home-9-membership-status` merged. API: `DiscoverNearbyGroupsUseCase` reads `userId`, LEFT JOINs `group_members` on `(group_id, user_id)` to derive `myRole: MemberRole | null` and `memberStatus: MemberStatus | null`; `NearbyGroupDto` gains both fields. Shared: `@localloop/shared-types@1.5.0` extends `NearbyGroup` with `myRole` + `memberStatus`. Mobile: `DiscoverCard`/`DiscoverRow` render one of four status badges per `memberStatus` (ACTIVE → "Conversar", PENDING → "Aguardando aprovação", BANNED → "Banido", null → "entrar"); `handleDiscoveryPress` branches: ACTIVE → navigate to chat with real `myRole`; PENDING/BANNED → no-op; null → existing join flow. **HOME-10 mobile**: radius UI landed on `HomeScreen` (chip + bottom-sheet modal with slider); user preference persisted to Zustand (client-only, not sent to server). All tests green, typecheck clean.

2026-05-09 — HOME-10 API (`feat/home-10-radius`), `DeleteGroupUseCase`, `@domain` alias refactor, and TypeORM registry (PR #10) merged. HOME-10 details: `DiscoverNearbyGroupsUseCase` reads optional `radiusKm` query param (default 25, max 50), calls `precisionForRadiusKm` to step down geohash precision (≤2km→6, ≤10km→5, >10km→4), passes prefix-based `LIKE` cells to `findNearby`, post-filters by `distance ≤ MIN(userRadiusKm, group.radiusKm) * 1000`; migration `1715000000000-AddGroupRadius` adds `radius_km NUMERIC(5,2) NOT NULL` backfilled from anchor type; `CreateGroupUseCase` defaults `radiusKm` from `DEFAULT_RADIUS_KM_BY_ANCHOR` when omitted; `NearbyGroup` gains `radiusKm` field (`@localloop/shared-types@1.4.0`); `precisionForRadiusKm` exported from `@localloop/geo-utils@1.3.0`. `DeleteGroupUseCase`: `DELETE /groups/:id` owner-only guard, cascades members/requests/messages. `@domain/*` alias: tsconfig + Jest mapper added; all 11 group use-case `.ts` files and 11 `.spec.ts` files migrated from `../../../domain/` to `@domain/`; messages + auth infra deep imports cleaned with `@/modules/…` paths. TypeORM registry: `src/infra/typeorm/entities.ts` + `src/infra/typeorm/migrations.ts` created; both `data-source.ts` and `app.module.ts` import from them — arrays can no longer drift (fixes the root cause of the 2026-05-01 prod incident).

2026-05-08 — `refactor/decouple-discovery-from-location` merged (mobile-only). New `useJoinGroup` hook owns `groupsApi.joinGroup` + the optimistic `MY_GROUPS_KEY` cache write; carries a stable `mutationKey: ['join-group']` so `useGroupChat` can `useIsMutating({ predicate })` and gate its history `useInfiniteQuery` (`enabled: !!accessToken && !isJoining`) plus the WS effect (early return on `isJoining`); the screen `loading` prop ORs in `isJoining` so the existing skeleton renders during the join. `HomeScreen.handleDiscoveryPress` replaces the old `myRole: null` navigate-to-chat path: OPEN cards fire-and-forget the mutation and navigate immediately with `myRole: MemberRole.MEMBER` (covers the 409 ALREADY_MEMBER case silently); APPROVAL_REQUIRED shows a Cancelar/Solicitar confirm modal and stays on Home. `handleRefresh` now `Promise.all([query.refetch(), myGroupsQuery.refetch()])`. `useNearbyGroups` no longer calls `userApi.updateLocation` (verified: `users.geohash` is written but never read on the API side; only remaining writer is `OnboardingScreen`). Plan captured in `~/.claude/plans/there-is-another-problem-wise-bird.md`.

2026-05-03 — TD-10 merged across all three repos on `feat/td-10-auth-user-shape` ([shared#8](https://github.com/Local-Loop-org/localloop-shared/pull/8), [api#7](https://github.com/Local-Loop-org/localloop-api/pull/7), [mobile#5](https://github.com/Local-Loop-org/localloop-mobile/pull/5)). Shared adds `UserSummary` to `@localloop/shared-types@1.3.0`. API enriches `UserSummaryDto` with `dmPermission` + `createdAt` (and tags `UserProfileDto` `implements UserSummary` for type-level enforcement); auth use cases unchanged because they already passed the full domain `User` to `fromEntity`. Mobile collapses the local 10-field `User` interface to a re-export of `UserSummary`, deletes the 6-line fakes block in `mapToAuthResponse`, trims 4 `buildUser()` fixtures + 1 inline fixture, and bumps `package.json` to `@localloop/shared-types@^1.3.0`. Plan captured in `~/.claude/plans/lets-resolve-the-td-10-piped-sunrise.md`.

2026-05-01 — Chat redesign Slice B merged across all three repos on `feat/chat-redesign-slice-b`. Shared: `@localloop/shared-types@1.2.0` adds `PresenceUpdate`; `docs/api-contracts.md` WebSocket section dropped its `[PLANNED]` tag and gained the `presence_update` event. API: `ChatGateway` adds an `emitPresence(groupId)` helper using `server.in(room).fetchSockets()`, called after every successful join, every leave, and from a `disconnecting` listener wrapped in `setImmediate` so Socket.IO's room cleanup runs before the count is read; 5 new gateway specs cover the join, leave, disconnect, no-emit-on-failure, and no-emit-without-rooms paths. Mobile: `useGroupChat` adds an `onlineCount` state seeded at 0, updates on `presence_update` events filtered to the active `groupId`, and resets on unmount; `GroupChatLayout` restructures `headerCenter` to stack the title row and a new `headerSubtitle` (mono font, `colors.faint`, letter-spaced) that renders only when `onlineCount > 0`. Plan captured in `~/.claude/plans/lets-plan-slice-b-peppy-canyon.md`. v1 caveat documented in api-contracts.md: multi-device users counted multiple times.

2026-05-01 — Prod hotfix + structural follow-up + DP-01 resolved. Prod was returning 500 on `GET /groups/nearby` because the HOME-6 migration `AddGroupAnchorCoordinates1714500000000` was registered in `data-source.ts` (CLI) but missing from `app.module.ts` (boot path with `migrationsRun: true`), so Render never applied it; the ORM entity referenced columns that didn't exist in prod. PR #2 (`fix/register-anchor-coords-migration`) added the missing registration — TypeORM ran the migration on next boot. PR #3 (`refactor/single-migration-registry`) extracted both arrays to `src/infra/typeorm/entities.ts` and `src/infra/typeorm/migrations.ts` so the two consumers can never drift again. DP-01 resolved: Upstash chosen for prod Redis, unblocking the Phase 2 `GET /groups/nearby` cache and the Phase 3 WebSocket pub-sub adapter.

2026-04-30 — HOME-6 merged across all three repos on `feat/home-6-distance-meters`. Replaces fuzzy `proximityLabel` with precise haversine distance. Shared: new `distanceMeters` helper in `@localloop/geo-utils@1.2.0` and `NearbyGroup` interface in `@localloop/shared-types@1.1.0`; `docs/api-contracts.md` + `docs/data-model.md` updated. API: migration adds `anchor_lat`/`anchor_lng NUMERIC(9,6) NOT NULL` to `groups` (backfilled from geohash centers), TypeORM numeric→number transformer on the ORM entity, `CreateGroupUseCase` persists lat/lng, `DiscoverNearbyGroupsUseCase` calls `distanceMeters(query.lat, query.lng, g.anchorLat, g.anchorLng)`, `NearbyGroupDto` is now an alias for the shared interface. Mobile: new `formatDistance` util + 4 unit tests; `DiscoverCard`/`DiscoverRow` swapped; 3 test fixtures updated. Plan captured in `~/.claude/plans/lets-plan-how-to-fluttering-pizza.md`.

---

## Completed

- [x] Repository split: localloop-api, localloop-mobile, localloop-shared (packages + docs)
- [x] PostgreSQL + PostGIS docker-compose
- [x] TypeORM data source config
- [x] Initial migration: all enums + users table
- [x] packages/shared-types — all enums
- [x] Auth module (Clean Architecture): ExchangeGoogleTokenUseCase, ExchangeAppleTokenUseCase, JWT strategy
- [x] AuthController: POST /auth/google, POST /auth/apple
- [x] Mobile: Google OAuth flow (Supabase → WebBrowser → session → backend JWT)
- [x] Mobile: Apple OAuth flow (basic)
- [x] Mobile: Zustand auth store with SecureStore persistence
- [x] Mobile: session initialization on app start
- [x] Mobile: RootNavigator (unauthenticated → onboarding → home)
- [x] Mobile: OnboardingScreen (display name + location permission request)
- [x] Mobile: axios apiClient with auth interceptor (+ 401 refresh/retry + test coverage)
- [x] Mobile: Supabase URL + anon key moved to env vars (`EXPO_PUBLIC_*`)
- [x] Mobile: `auth.api.ts` migrated to shared `apiClient` (axios, env-based URL)
- [x] Mobile: `apiClient` base URL from env var (`EXPO_PUBLIC_API_URL`)
- [x] Backend: RefreshTokenUseCase + POST /auth/refresh (stateless JWT, validates user active)
- [x] Jest path alias (@/\*) configured — unblocks all future unit tests
- [x] CI: localloop-api — lint + unit tests + integration tests + Docker image build
- [x] CI: localloop-mobile — lint + type-check + unit tests + EAS Build Android APK + GitHub Release publish (iOS deferred)
- [x] CI + publish: localloop-shared — lint + build + auto-publish to npm on push to main
- [x] CD: API deployed to Render (free tier) + Neon Postgres (free tier, PostGIS enabled)
- [x] CD: GitHub Actions triggers Render deploy hook after CI passes
- [x] Environment: .env files configured for both API and mobile repos
- [x] packages/geo-utils — coordinate→geohash, 8 neighbor cells, proximity labels (v1.1.0 published)
- [x] UserModule: GET /users/me, PATCH /users/me, PATCH /users/me/location (Clean Architecture)
- [x] Global ValidationPipe (whitelist + transform) added to API bootstrap
- [x] Mobile: OnboardingScreen wired to backend — PATCH /users/me (display name) + PATCH /users/me/location on finish
- [x] Infrastructure: Redis 7 service added to `docker-compose.yml` (alongside PostGIS)
- [x] Phase 1 unit test coverage — API use cases + mobile stores/screens (see Testing track)
- [x] Phase 2 vertical slice — API: migration for `groups` / `group_members` / `group_join_requests`; `GroupsModule` with `CreateGroup`, `DiscoverNearbyGroups`, `GetGroupDetail`, `JoinGroup`, `ListJoinRequests` use cases; 5 endpoints under `/groups`
- [x] Phase 2 vertical slice — Mobile: `CreateGroupScreen`, `GroupDiscoveryScreen`, `GroupDetailScreen`; `AuthenticatedStack` nested navigator; `useCurrentLocation` hook; `groups.api.ts` client
- [x] Phase 2 vertical slice — Deploy: API migration applied on Render, Phase 2 endpoints live
- [x] Phase 2 moderation — API: `LeaveGroupUseCase`, `BanMemberUseCase`, `ResolveJoinRequestUseCase` (handles both approve and reject via `action` field), `ListGroupMembersUseCase`; endpoints `PATCH /groups/:id/requests/:requestId`, `DELETE /groups/:id/members/me`, `DELETE /groups/:id/members/:userId`, `GET /groups/:id/members` (paginated)
- [x] Phase 2 moderation — Mobile: `GroupMembersScreen` + moderation UI (approve/reject/ban) wired into `GroupDetailScreen`; `groups.api.ts` extended
- [x] Phase 2 unit test coverage — API: specs for all 9 use cases (vertical slice + moderation). Mobile: `useCurrentLocation`, `groups.api`, `CreateGroupScreen`, `GroupDiscoveryScreen`, `GroupDetailScreen`, `GroupMembersScreen`
- [x] Phase 3 Slice 1 — Text chat. API: `messages` migration, `MessagesModule` (domain entity + repo, `SendMessage` + `GetMessageHistory` use cases with specs, TypeORM mapper/repo, `GET /groups/:id/messages` history endpoint, Socket.IO `/chat` gateway with `join_group` / `leave_group` / `send_message`, Redis pub-sub adapter with in-memory fallback, namespace middleware auth). Mobile: `messages.api`, `chat-socket`, `useGroupChat` (React Query `useInfiniteQuery` history + optimistic `sendMessage` — TD-09 pilot), `GroupChatScreen` + nav wiring + GroupDetail entry button. Unit test coverage on all new use cases, the gateway, the hook, and the screen.
- [x] Home redesign — Slice 1 (mobile-only, `feat/home-redesign`). `GroupDiscoveryScreen` replaced by `HomeScreen` with sectioned layout (Lugares / Bairros / Prédios / Eventos via `anchorType`); horizontal cards for establishments + events, vertical rows for neighborhoods + condos; empty buckets hidden; CITY excluded; `LocalLoop` header + `more` action sheet (Sair only); presentational bottom tab bar (Início/Inbox/+/Mapa/Perfil) with `+` → `CreateGroup`. New `useNearbyGroups` React Query hook (key `['groups','nearby', "lat,lng"]`, 30s `staleTime`, calls `userApi.updateLocation` before `groupsApi.getNearbyGroups`). New shared util `@/shared/anchor/labels` (`ANCHOR_TYPE_LABELS` + `ANCHOR_SECTION_LABELS`); CreateGroupScreen migrated. Route renamed `GroupDiscovery` → `Home`; old screen folder deleted. 121/121 tests green, typecheck clean. "Meus grupos" pinned section, real bottom-tabs navigator, distance string, presence, search, and location chip all deferred to HOME-2..HOME-9.
- [x] Phase 3 Chat redesign — Slice A (mobile-only, `feat/chat-redesign-slice-a`). New `GroupChatScreen` layout: custom header (back / anchor-type icon + tappable group name + chevron / members), pt-BR day separators (HOJE/ONTEM/DD/MM via `date-fns`), peer bubbles (dark surface + line border + asymmetric `borderBottomLeftRadius`), own bubbles (cyan→lavender `LinearGradient` + asymmetric `borderBottomRightRadius`), mono-font timestamps, redesigned composer (inert `+` button, pill `TextInput`, gradient send button). Nav rewire: Discovery → Chat directly (Detail/Members reachable via the chat header). Shared icon system at `src/shared/icons/` — `<Icon name=… size=… color=… strokeWidth=…/>` built on `react-native-svg` covering 30 glyphs + `anchorIconName(AnchorType)` mapping; replaces `@expo/vector-icons`. Theme: added `colors.line/dim/faint` and `colors.accent2` (soft lavender for the gradient pair). Route params: `GroupChat` extended with `anchorType: AnchorType`; both call sites updated. Tests: 114/114 green, typecheck clean. Slice B (proximity badges + presence subtitle) intentionally deferred — needs gateway/geohash work.
- [x] Backend: TypeORM `entities` and `migrations` consolidated into single registry files at `src/infra/typeorm/{entities,migrations}.ts`. Both `data-source.ts` (CLI) and `app.module.ts` (boot, `migrationsRun: true`) import from the same source — the two arrays can no longer drift. Triggered by a prod incident on 2026-05-01; properly implemented in PR #10 (`refactor/typeorm-registry`) on 2026-05-09.
- [x] API: `@domain/*` tsconfig path alias points to `src/modules/groups/domain/*`; Jest `moduleNameMapper` aligned. All 11 group use-case `.ts` + `.spec.ts` files migrated from deep `../../../domain/` relative imports to `@domain/`. Messages and auth infra deep imports cleaned using `@/modules/…` absolute paths (`refactor/domain-alias`, PR #9).
- [x] HOME-9 (all three repos) — Full membership status on discovery cards (`feat/home-9-membership-status`). API: `DiscoverNearbyGroupsUseCase` receives `userId`, LEFT JOINs `group_members` to read role + status, derives `myRole: MemberRole | null` and `memberStatus: MemberStatus | null`; `NearbyGroupDto` gains both fields. Shared: `@localloop/shared-types@1.5.0` extends `NearbyGroup` with both fields. Mobile: `DiscoverCard`/`DiscoverRow` render four status badges (ACTIVE, PENDING, BANNED, none); `handleDiscoveryPress` branches on status (ACTIVE → chat with real role; PENDING/BANNED/none → respective UX).
- [x] HOME-10 (all three repos) — Configurable discovery radius (`feat/home-10-radius` API, `feat/home-10-mobile-radius` mobile). API: `GET /groups/nearby` accepts optional `radiusKm` (default 25km, max 50km); `DiscoverNearbyGroupsUseCase` steps down geohash precision via `precisionForRadiusKm` and post-filters by `MIN(userRadiusKm, group.radiusKm)`; migration adds `radius_km NUMERIC(5,2) NOT NULL`; `CreateGroupUseCase` defaults from `DEFAULT_RADIUS_KM_BY_ANCHOR`; `@localloop/geo-utils@1.3.0` exports `precisionForRadiusKm`; `@localloop/shared-types@1.4.0` adds `radiusKm` to `NearbyGroup`. Mobile: radius chip + bottom-sheet modal with slider on `HomeScreen`; user preference persisted to Zustand (client-only).
- [x] Phase 2 — `DeleteGroupUseCase` + `DELETE /groups/:id` (owner-only; cascades members, requests, messages).
- [x] HOME-6 — Real distance on discover cards (all three repos, `feat/home-6-distance-meters`). Shared: `@localloop/geo-utils@1.2.0` adds haversine `distanceMeters(lat1, lng1, lat2, lng2)`; `@localloop/shared-types@1.1.0` adds the `NearbyGroup` interface (single source of truth for API + mobile). API: migration `1714500000000-AddGroupAnchorCoordinates` adds `anchor_lat` / `anchor_lng NUMERIC(9,6) NOT NULL` to `groups` and backfills existing rows from geohash centers via `ngeohash.decode`; ORM entity gets a numeric→number transformer (pg returns NUMERIC as string); `CreateGroupUseCase` persists lat/lng alongside the derived geohash; `DiscoverNearbyGroupsUseCase` returns `distanceMeters` instead of `proximityLabel`; `NearbyGroupDto` aliased to the shared interface; 9 spec fixtures updated for the new `Group` constructor args. Mobile: `groups.api.ts` re-exports `NearbyGroup` from shared-types and drops the inline `ProximityLabel` union; new `src/shared/format/distance.ts` formatter (`<1000m` → nearest-10 `M`, `<10km` → one-decimal pt-BR `Km`, `≥10km` → integer `Km`) with 4 tests; `DiscoverCard`/`DiscoverRow` render `formatDistance(group.distanceMeters)`; 3 test fixtures swapped. 132/132 mobile + 112/112 API tests green, typechecks clean.
- [x] Phase 3 Chat redesign — Slice B (all three repos, `feat/chat-redesign-slice-b`). Adds live online count to the chat header subtitle. Shared: `@localloop/shared-types@1.2.0` exports `PresenceUpdate { groupId, count }`; `docs/api-contracts.md` drops the `[PLANNED]` tag from the `/chat` WebSocket section and documents the new `presence_update` server→client event. API: `ChatGateway` adds `emitPresence(groupId)` reading room size via `server.in(room).fetchSockets()` (multi-instance-correct through the Redis adapter), called after every successful join, every leave, and from a `disconnecting` listener wrapped in `setImmediate` so Socket.IO's room cleanup runs before the count is read; 5 new gateway specs (117/117 green). Mobile: `useGroupChat` adds `onlineCount` state, listens for `presence_update` filtered to the active `groupId`, resets to 0 on unmount; `GroupChatLayout` restructures `headerCenter` to stack the title row and a new mono-font `headerSubtitle` (`colors.faint`, letter-spaced) rendered only when `onlineCount > 0` as `· N ONLINE ·`; 4 new tests (136/136 green, typechecks clean). v1 caveat: same user on multiple devices counts multiple times (documented in api-contracts.md). Unblocks HOME-5.
- [x] Mobile — Discovery-tap auto-join (`refactor/decouple-discovery-from-location`). `HomeScreen.handleDiscoveryPress` branches on `group.privacy`: OPEN fires `useJoinGroup` (no await) and navigates immediately to `GroupChat`; APPROVAL_REQUIRED shows a "Solicitar entrada?" confirm modal and stays on Home. `useJoinGroup` hook extracted from `GroupDetailScreen` — owns `groupsApi.joinGroup` + optimistic `MY_GROUPS_KEY` cache prepend on joined, no-op on pending; stable `mutationKey: ['join-group']` lets `useGroupChat` gate its history `useInfiniteQuery` and WS effect via `useIsMutating`. `handleRefresh` now refetches `useNearbyGroups` + `useMyGroups` in parallel. Drops redundant `userApi.updateLocation` from `useNearbyGroups`. 184/184 mobile tests green.
- [x] API — `UpdateGroupUseCase` + `PATCH /groups/:id` (owner or moderator; partial update of `name`, `description`, `anchorLabel`, `privacy`, `radiusKm`; returns `GroupDetailDto`). Auth guard: 403 for non-privileged callers.
- [x] Mobile — `GroupDetailScreen` G2 redesign + full React Query migration + inline editing. G2: Hero gradient/glow/border, `MemberStack` border fix, `MembersSection` row list with expand drawer (promote + ban). RQ: 9 `useMutation`/`useQuery` hooks replace all `useState+useEffect` patterns; optimistic updates with rollback on every mutation. Inline edit: pencil in `HeaderBar` (owners/moderators) → name/description `TextInput`, `anchorLabel`, `privacy`, `radiusKm` all live; Salvar/Cancelar. `GroupDetail` interface gains `radiusKm`. 214/214 tests, typecheck clean.

---

## In progress

Phase 4 DM flow alignment Tasks A–D closed; the accept/decline endpoints + `dm_request_accepted` WS event + manual exception management endpoints are live. Next natural picks in the alignment track: DM-TASK-E (inbox liveness — `mark_dm_read`, archive, `dm_summary_update` — largest remaining task, recommend a fresh session), DM-TASK-F (DM push fan-out + WS dedup), or M1 mobile inbox wiring (`dms.api.ts` + React Query hooks replacing mocks in InboxScreen) and M2 DmChatScreen. Phase 3 Slice 3 message permissions also mid-flight: shared enum published (step 1/3); API migration + `SendMessageUseCase` enforcement (step 2/3) and mobile composer gating (step 3/3) remain. Other candidates: GroupMembersScreen redesign, HOME-12 Map, Phase 3 Slice 2 media upload, Phase 2 Redis cache. HOME-8 search deferred to Phase 5 Polish.

---

## Up next

### Phase 1 — Complete Foundation ✅

**1. Cleanup** ✅

- [x] Move Supabase URL + anon key to env vars (`EXPO_PUBLIC_*`)
- [x] Unify HTTP layer: `auth.api.ts` migrated to shared `apiClient` (axios, env-based URL)
- [x] 401 interceptor on `apiClient` — refresh + retry queue + test coverage

**2. Backend — Phase 1 endpoints** ✅

- [x] `RefreshTokenUseCase` + `POST /auth/refresh`
- [x] UserModule: `GET /users/me`, `PATCH /users/me` (display name, dm_permission)
- [x] `PATCH /users/me/location` (coordinate → geohash via geo-utils)
- [x] `packages/geo-utils`: coordinate→geohash, 8 neighbor cells, proximity label generation (v1.1.0)

**3. Mobile — Phase 1 wiring** ✅

- [x] OnboardingScreen: call `PATCH /users/me` to persist display name to backend
- [x] OnboardingScreen: call `PATCH /users/me/location` after granting permission
- [x] Update `apiClient` base URL from hardcoded to env var

**4. Infrastructure** ✅

- [x] Add Redis service to `docker-compose.yml`
- [x] Fix `JwtStrategy` fallback secret (TD-01) — throw error if `JWT_SECRET` not set

### Testing (parallel track — build as you implement)

**API — unit tests (Jest)** ✅

- [x] `ExchangeGoogleTokenUseCase` — 6 tests: new user, existing user, provider_id fallback, default displayName, supabase error, no user
- [x] `ExchangeAppleTokenUseCase` — 7 tests mirroring the Google spec
- [x] `RefreshTokenUseCase` — 5 tests: valid, expired, invalid, user not found, user inactive
- [x] `UpdateUserProfileUseCase` — 6 tests: not-found, field-by-field updates, no-op, DTO shape
- [x] `UpdateUserLocationUseCase` — 3 tests: coordinate→geohash via geo-utils, distinct geohashes for distant coords, coordinate boundaries. (<300m no-op deferred — logic not implemented in source yet.)
- [x] Phase 2 use cases — 46 tests across 9 specs: `CreateGroup`, `DiscoverNearbyGroups`, `GetGroupDetail`, `JoinGroup`, `ListJoinRequests`, `LeaveGroup`, `BanMember`, `ResolveJoinRequest`, `ListGroupMembers`

**API — integration tests (Jest + Supertest + test DB)**

- [ ] `POST /auth/google` — valid token, invalid token
- [ ] `POST /auth/apple` — valid token, invalid token
- [ ] `POST /auth/refresh` — valid, expired, invalid
- [ ] `GET /users/me` — authenticated, unauthenticated
- [ ] `PATCH /users/me` — valid update, invalid fields
- [ ] `PATCH /users/me/location` — valid coords, verifies geohash stored (not coords)

**Mobile — unit tests (Jest + React Native Testing Library)** ✅

- [x] `useAuthStore`: setAuth, logout, initialize (3 paths), setNewUserStatus, updateUser — 9 tests
- [x] `useAuthLogin`: Google/Apple success + error + cancel + no-session + loading — 8 tests
- [x] `LoginScreen`: renders buttons, dispatches handlers, shows loader — 4 tests
- [x] `RootNavigator`: auth stack / onboarding / home routing, loader, initialize-on-mount — 5 tests
- [x] `OnboardingScreen`: name validation, location denied, API calls + updateUser + isNewUser flip on success, alert + isNewUser unchanged on API failure — 6 tests
- [x] `apiClient`: auth header injection, 401 refresh + retry queue, non-401 pass-through
- [x] Phase 2 mobile — `useCurrentLocation` (4), `groups.api` (9), `CreateGroupScreen` (6), `GroupDiscoveryScreen` (7), `GroupMembersScreen` (9), `GroupDetailScreen` (27)

**E2E (Maestro)**

- [ ] Flow 1 — Google login → new user → onboarding → home
- [ ] Flow 2 — App restart → session restored → goes directly to home
- [ ] Flow 3 — Logout → goes to login screen

### CI/CD

**API — GitHub Actions** ✅

- [x] Workflow: `lint → unit tests → integration tests → docker build → Render deploy hook`
- [x] Trigger: push to `main`, PRs targeting `main`
- [x] Deploy: Render (free tier) triggered via deploy hook after CI passes

**Mobile — GitHub Actions** ✅

- [x] Workflow: `lint → type-check → unit tests → EAS Build APK → GitHub Release` (Android only)
- [x] Trigger: push to `main`, PRs targeting `main` (release step gated to push-on-main)
- [x] Delivery: APK attached to a GitHub Release tagged `build-<run_number>` — sideload from the Releases page on the device
- [x] iOS builds deferred until Apple Developer account is set up

**Shared — GitHub Actions** ✅

- [x] Workflow: `lint → build → npm publish` (auto-publish on push to main)

---

### Phase 2 — Groups

**Vertical slice — create + discover + join** ✅

- [x] Migration: `groups`, `group_members`, `group_join_requests` tables
- [x] GroupsModule: `CreateGroupUseCase`, `DiscoverNearbyGroupsUseCase`, `GetGroupDetailUseCase`, `JoinGroupUseCase`, `ListJoinRequestsUseCase`
- [x] Mobile: `CreateGroupScreen`, `GroupDiscoveryScreen`, `GroupDetailScreen`, `AuthenticatedStack`

**Moderation slice — leave + approve/reject + ban + members listing** ✅

- [x] `LeaveGroupUseCase` + `DELETE /groups/:id/members/me` (owner-can't-leave rule)
- [x] `ResolveJoinRequestUseCase` (single use case handling approve/reject via `action` field) + `BanMemberUseCase`
- [x] Endpoints: `PATCH /groups/:id/requests/:requestId`, `DELETE /groups/:id/members/:userId`, `GET /groups/:id/members` (paginated)
- [x] Mobile: `GroupMembersScreen` + moderation UI (approve/reject/ban) wired in `GroupDetailScreen`

**Phase 2 remaining**

- [ ] Redis cache for `GET /groups/nearby` (TTL = 5min per geohash cell) — unblocked (DP-01 resolved → Upstash)
- [ ] GroupMembersScreen redesign + unban: API surface complete — unban (`POST /groups/:id/members/:userId/unban` on `feat/unban-member-api`), role changes (`POST .../promote` and `POST .../demote` on `feat/member-role-changes`), and the banned-members list (`GET .../members/banned` on `feat/list-banned-members`). Mobile still needs the redesign that splits `GroupMembersScreen` into three sections — active members, join requests (only for approval-required groups), and banned users — with React Query-backed pagination/mutations and per-row promote/demote actions for owners.
- [x] `DeleteGroupUseCase` + `DELETE /groups/:id` (owner-only; cascades members, requests, messages). Mobile UI (owner action sheet + optimistic removal) deferred to separate mobile branch.
- [x] Unit tests for all Phase 2 use cases, mobile screens, hook, api module
- [ ] Integration tests (Supertest + test DB) for Phase 2 endpoints
- [ ] Maestro E2E: discover groups, join open group, join approval group, leave group

### Phase 3 — Chat

**Slice 1 — Text chat** ✅

- [x] Migration: `messages` table
- [x] MessagesModule: `GetMessageHistoryUseCase`, `SendMessageUseCase`
- [x] WebSocket gateway (Socket.IO) + Redis adapter for pub-sub
- [x] Mobile: `GroupChatScreen` (real-time, optimistic sends via React Query)
- [x] Unit tests: use cases, gateway, hook, screen

**Slice 2 — Media + remaining tests**

- [ ] Media upload: presigned URL endpoint + Supabase Storage integration
- [ ] Mobile: media picker + image/video rendering in `GroupChatScreen`
- [ ] WebSocket integration tests (full ack/broadcast path against a running app + Redis)
- [ ] Maestro E2E: send text message, send image, receive message in real-time

**Slice 3 — Message permissions**

`sendPerm` and `sendMediaPerm` already exist as local-only fields in `CreateGroupScreen` (pinned by a container test — see memory). This slice makes them functional end-to-end.

- [x] Shared: add `MessagePermission` enum (`ADMIN_ONLY`, `MEMBERS_IN_RADIUS`, `ALL_MEMBERS`) to `@localloop/shared-types` (minor bump).
- [ ] API: migration adds `send_text_perm` + `send_media_perm ENUM NOT NULL DEFAULT 'ALL_MEMBERS'` to `groups`. `SendMessageUseCase` enforces the policy: `ADMIN_ONLY` → sender must be `OWNER` or `ADMIN`; `MEMBERS_IN_RADIUS` → sender's geohash must overlap the group's anchor geohash neighbors; `ALL_MEMBERS` → any member. `CreateGroupUseCase` + `UpdateGroupUseCase` accept and persist both fields.
- [ ] Mobile: wire `sendPerm` + `sendMediaPerm` selectors in `CreateGroupScreen` to the API payload (removes the local-only pin). Composer disables text input / attach button when the active user's role doesn't satisfy the policy (derive from `myRole` + group detail). Show a contextual hint ("Apenas admins podem enviar mensagens") when disabled.
- [ ] **Location freshness for `MEMBERS_IN_RADIUS`**: `users.geohash` is currently written only once (onboarding) and never read. Before enforcing `MEMBERS_IN_RADIUS` policy, add a location update strategy: trigger `PATCH /users/me/location` on significant-change events (iOS/Android significant-location-change API) or on each app foreground; add a <300m no-op in `UpdateUserLocationUseCase` to avoid redundant DB writes on small movements.

**Chat redesign — first pass of new wireframes** (split into two slices)

_Slice A — frontend-only_ ✅

- [x] Custom header on `GroupChatScreen`: back button, anchor-type icon + group name + chevron (tap → `GroupDetailScreen`), members icon (tap → `GroupMembersScreen`)
- [x] Day separators in the message list (`· HOJE ·`, `· ONTEM ·`, `· DD/MM ·` via `date-fns` + pt-BR locale)
- [x] Bubble redesign: peer messages dark surface + line border + name above; own messages cyan→lavender gradient with asymmetric corners
- [x] Input bar redesign: `+` action button (inert until Slice 2 media), pill input, gradient send button
- [x] Nav flow change: `GroupDiscoveryScreen` opens `GroupChatScreen` directly; detail/members reachable only from the chat header
- [x] Hide proximity tag and online count in the header until Slice B lands — header rendered without them rather than stubbed
- [x] Shared icon system at `src/shared/icons/` (custom `<Icon>` on `react-native-svg`, typed `IconName` union, `anchorIconName(AnchorType)` helper); replaces `@expo/vector-icons`

_Slice B — backend-touching pieces_ ✅

- [x] Online count + presence: gateway tracks `group:{groupId}` room size and emits `presence_update` events on join/leave/disconnect; subtitle shows `· N ONLINE ·`

### Home redesign — follow-ups

Slice 1 (`HomeScreen` + sectioned discovery + presentational bottom tabs) is implemented on `feat/home-redesign`. Items below extend it incrementally without re-laying-out the screen.

- [x] **HOME-2** API: `GET /groups/me` (paginated; returns `id`, `name`, `anchorType`, `anchorLabel`, `memberCount`, `myRole`; include `lastMessage` summary + `unreadCount` + `lastReadAt` if scope allows). Unblocks the "Meus grupos" pinned section.
- [x] **HOME-3** Mobile: render the "Meus grupos" pinned section once HOME-2 ships. `MyGroupRow` component is intentionally **not** in place yet (deferred to this ticket); wire `useMyGroups` (React Query) + render above the discovery sections.
- [x] **HOME-4** Mobile: real `@react-navigation/bottom-tabs` navigator wrapping the home stack. Stub `InboxScreen`, `MapScreen`, `ProfileScreen` (each a centered "em breve" panel). Move logout from the header `more` action sheet to `ProfileScreen`.
- [x] **HOME-5** API + mobile: live presence on Home cards/rows. API `/chat` has read-only `watch_presence` / `unwatch_presence` observer rooms; Home observes counts without inflating them. Mobile shows a green dot on "Meus grupos", a compact live count badge on horizontal cards, and `N Online` on vertical rows.
- [x] **HOME-6** API + mobile: distance string ("210M") on `NearbyGroup` (API returns meters; mobile formats `<n>M` / `<n>Km`). Replaces `proximityLabel` on cards. — _Done (`feat/home-6-distance-meters`)._
- [x] **HOME-7** Mobile: "Ver todos →" detail screens — one per section (`GroupListByTypeScreen`) showing all groups of a single anchor type with infinite scroll. Also: add a "Ver todos" entry for "Meus grupos" using `useMyGroups(limit=50)` or `useInfiniteQuery`. Reuse or extract `MyGroupRow` from `HomeScreen/layout/MyGroupRow.tsx` — it has the right shape but may need additions (unread badge, swipe-to-leave) before extracting to a shared folder.
- [ ] **HOME-8** Mobile: deferred to Phase 5 Polish; the no-op search icon is hidden, and the real group-search screen still needs to be built.
- [x] **HOME-9** API + mobile: full membership status on discovery cards. — _Done (`feat/home-9-membership-status`)._
- [x] **HOME-10** API + mobile: configurable discovery radius with mobile UI. — _Done (`feat/home-10-radius` + `feat/home-10-mobile-radius`)._
- [x] **HOME-11** API + mobile: My Groups freshness. `GET /groups/me` supplies `unreadCount`, `lastReadAt`, and `lastMessage`; one shared `MyGroupRow` is reused by Home and `MyGroupsScreen`; unread badges render from persisted counts; `/chat` emits user-specific `group_summary_update` events so new messages refresh the preview without waiting for a refetch.
- [ ] **HOME-12** Mobile: real `MapScreen` replacing the current placeholder. Show nearby groups on a map using the existing location/radius model, with pins/clusters that open the same group chat/detail flow as Home.

### Phase 4 — DMs + Push Notifications

**Done**

- [x] Resolve DP-02: Expo Push first behind a provider-neutral API/mobile boundary, with future FCM adapter support.
- [x] Push notification initial setup: shared contracts, `push_devices`, user permission status, API registration/preference endpoints, and provider port + Expo adapter.
- [x] Mobile push registration handling: Home asks once when `pushPermissionStatus = null`; Profile toggle owns later enable/disable changes.
- [x] Group message push fan-out: best-effort Expo push for active offline group members, excluding sender and users connected to `group:{groupId}`.
- [x] Migration: `direct_messages` table — `1717000000000-CreateDirectMessages` (functional `idx_dm_conversation` index + `chk_dm_distinct_participants` check).
- [x] Migration: `dm_requests`, `dm_conversation_state`, `dm_permission_exceptions` — `1717100000000-AddDmInboxSupport`.
- [x] DMModule: `SendDirectMessageUseCase` + `GetDirectMessageHistoryUseCase` + `ListDmConversationsUseCase` + `ListDmRequestsUseCase`. Send returns the discriminated union (`{type:'message'} | {type:'request', requestId}`) via `routeDm` (`hasPermissionException` short-circuit, then `dm_permission` + `IGroupRepository.hasSharedActiveGroup` for `MEMBERS`); blocked sends UPSERT into `dm_requests`. `ChatGateway` extended with `join_dm`/`leave_dm`/`send_dm` and broadcasts into `dm:{sortedA}:{sortedB}`. HTTP: `GET`/`POST /dm/:userId`, `GET /dm`, `GET /dm/requests`. Media DMs rejected in v1 (`MEDIA_DM_NOT_SUPPORTED`).
- [x] Spec: `architecture.md` "Direct messages (Phase 4)" + ADR-006 + the cross-doc consolidation (2026-05-18, `docs/direct-message-flow`).

**DM flow alignment — close the spec-vs-code gaps**

The 2026-05-18 doc consolidation (`docs/direct-message-flow`) enumerated 12 gaps in `architecture.md` → "Direct messages (Phase 4)" → "Open gaps". The 12 gaps + archive endpoints are grouped into **8 tasks below by shared entity/file touchpoint** — work bundled here lands in one PR per task. Recommended order is roughly top-to-bottom (cheap unblockers first, breaking cross-repo change last). Track per sub-item with the checkboxes.

##### DM-TASK-A · Send-side enrichments
**Touches:** `SendDirectMessageUseCase`, `dm_permission_exceptions`, `dm_conversation_state`. **Closes:** Gap 1, Gap 11.

- [x] Write `exception(sender, recipient)` on successful direct delivery (idempotent `INSERT … ON CONFLICT DO NOTHING`). No-op on the request path. **(Gap 1)**
- [x] Eager-init `dm_conversation_state(sender, recipient)` with `last_read_at = now()` on send (sender's row only — recipient's row stays lazy). **(Gap 11)**
- [x] Unit tests cover: direct-delivery writes both rows; request-route writes neither; idempotency on repeat sends.

##### DM-TASK-B · `send_dm` gateway result-type branching
**Touches:** `ChatGateway.onSendDm`. **Closes:** Gap 4.

- [x] Branch on `result.type` in `onSendDm`.
- [x] `message` → keep current `new_direct_message` broadcast into `dm:{sortedA}:{sortedB}`.
- [x] `request` → emit `dm_request_sent { requestId }` to sender's own socket only; no room broadcast.
- [x] Add `DM_REQUEST_SENT` constant to `@localloop/shared-types` chat-socket events (minor bump).
- [x] Gateway spec covers both branches + the no-leak property (room sockets never see a request payload).

##### DM-TASK-C · Accept/decline request flow + WS feedback
**Touches:** new `AcceptDmRequestUseCase` + `DeclineDmRequestUseCase`, `dm_requests`, `direct_messages`, `dm_permission_exceptions`, `ChatGateway`. **Closes:** Gap 2, Gap 5.

- [x] `AcceptDmRequestUseCase` — single transaction: insert `direct_messages` row from held `dm_requests.content` with original `created_at`, write `exception(recipient, sender)`, eager-init `dm_conversation_state` for sender, delete `dm_requests` row.
- [x] `DeclineDmRequestUseCase` — delete `dm_requests` row only.
- [x] `POST /dm/requests/:id/accept` and `POST /dm/requests/:id/decline` endpoints (recipient-only; non-recipient → 404 to hide existence).
- [x] Emit `dm_request_accepted` to every connected socket of the original sender (multi-device safe; iterates `server.fetchSockets()` filtering by `socket.data.user.id`).
- [x] Add `DM_REQUEST_ACCEPTED` constant to `@localloop/shared-types` chat-socket events.
- [x] Tests: accept tx atomicity (rollback covered by the transaction wrapper), decline idempotency, accept-then-accept returns 404 (row already gone), sender receives WS event on accept, no leak to other users or DM-room observers.

##### DM-TASK-D · Manual exception management endpoints
**Touches:** new `*DmExceptionUseCase` trio + controller, `dm_permission_exceptions`. **Closes:** Gap 3.

- [x] `ListDmExceptionsUseCase` + `GET /users/me/dm-exceptions` (paginated peer list joined to `users`; inactive peers filtered out; cursor `(createdAt, peerId)`).
- [x] `AddDmExceptionUseCase` + `PUT /users/me/dm-exceptions/:peerId` (idempotent UPSERT via `ON CONFLICT DO NOTHING`; self-pair → 400 `CANNOT_EXCEPTION_SELF`; missing or inactive peer → 404 `PEER_NOT_FOUND`).
- [x] `RemoveDmExceptionUseCase` + `DELETE /users/me/dm-exceptions/:peerId` (idempotent DELETE; self-pair → 400; returns 204 even if no row matched).
- [x] Tests: add/remove idempotency, self-pair rejection, pagination correctness (5 list + 5 add + 4 remove specs).

##### DM-TASK-E · Inbox liveness + per-conversation state mutations
**Touches:** `ChatGateway`, `dm_conversation_state`, new HTTP archive endpoints, all DM mutation paths. **Closes:** Gap 6, Gap 7, archive endpoints.

- [ ] `mark_dm_read { peerId }` WS event + use case: upsert `dm_conversation_state(caller, peer).last_read_at = now()`.
- [ ] `PUT /dm/:userId/archive` and `DELETE /dm/:userId/archive` endpoints: upsert `dm_conversation_state.archived`.
- [ ] `watch_dm_inbox` / `unwatch_dm_inbox` WS events (user-scoped subscription, no payload).
- [ ] Define `dm_summary_update` payload (mirror `group_summary_update`).
- [ ] Emit `dm_summary_update` from every mutation path: new message delivered (Task A's send path), accept-request promotion (Task C), mark-read, archive/unarchive.
- [ ] Add `MARK_DM_READ` / `WATCH_DM_INBOX` / `UNWATCH_DM_INBOX` / `DM_SUMMARY_UPDATE` constants to `@localloop/shared-types`.
- [ ] Tests: mark-read clears `unreadCount` on the next emit; archive does NOT clear unread; subscription is user-scoped (no cross-user leak).

##### DM-TASK-F · DM push fan-out + WS dedup
**Touches:** `ChatGateway`, notifications module, push provider port. **Closes:** Gap 9, Gap 10.

- [ ] After successful direct delivery in `onSendDm`, fire best-effort Expo push to recipient's enabled devices.
- [ ] Skip the push if recipient has any socket joined to `dm:{sortedA}:{sortedB}` (server-side WS dedup, mirrors group fan-out's skip rule).
- [ ] Do NOT fire push on acceptance (per design — sender gets `dm_request_accepted` WS event instead).
- [ ] Payload carries `peerId` for mobile deep-link routing to `DmChatScreen`.
- [ ] Tests: push fires when recipient offline; skipped when in the dm room; not fired on accept.

##### DM-TASK-G · Deactivated-peer placeholder
**Touches:** `listInbox` SQL, possibly `findByIdWithSender` and other read paths. **Closes:** Gap 8.

- [ ] `listInbox` SQL substitutes `peer_name = 'Conta desativada'` and `peer_avatar_url = NULL` when joined `users.is_active = false`.
- [ ] Audit other read endpoints (`GET /dm/:userId`, `GET /dm/requests`) for the same substitution; apply consistently.
- [ ] Tests: deactivated peer still appears in inbox with placeholder; messages still readable.

##### DM-TASK-H · DTO naming standardization (breaking, cross-repo)
**Touches:** `@localloop/shared-types` `DirectMessage`, API DTOs, mobile types. **Closes:** Gap 12.

- [ ] Rename `DirectMessageRow.senderAvatar` → `senderAvatarUrl` in API.
- [ ] Update `@localloop/shared-types` `DirectMessage.senderAvatarUrl` (minor or major bump — major if any mobile code already consumes the field).
- [ ] Coordinate with mobile branch consuming the same shape (probably `feat/inbox-*`).
- [ ] Land all three repos in lockstep.

**Inbox + DM chat flow — remaining slices**

The mobile InboxScreen (I2 — search + chips: Todas / Não lidas / Solicitações / Arquivadas) is implemented on `feat/inbox-i2-search-chips` with mocked data, the existing `SearchInput` + `FilterChip`, the user `Avatar`, and a new shared `ConversationRow` primitive reused by `MyGroupRow`. The slices below wire it to a real backend and add the matching DM chat experience. **DM-TASK-A through DM-TASK-H are prerequisites for several of the slices below — close them first or interleave deliberately.**

#### ~~S1 · API: inbox-list + request endpoints~~ ✅
Shipped on `feat/dm-inbox-api` ([api#23](https://github.com/Local-Loop-org/localloop-api/pull/23)). `GET /dm` + `GET /dm/requests` with cursor pagination; `SendDirectMessageUseCase` routes to `dm_requests` on permission mismatch; three new tables (`dm_requests`, `dm_conversation_state`, `dm_permission_exceptions`). Still deferred: archive/unarchive mutations, mark-read endpoint (tables exist, endpoints follow in S2/M1).

#### S2 · API: realtime inbox summary events
Extend `ChatGateway` with `watch_dm_inbox` / `unwatch_dm_inbox` for user-scoped subscriptions, and emit `dm_summary_update` whenever a thread's last message or unread count changes. Reuses the existing Redis adapter. Lets the InboxScreen rows refresh live without polling.

#### S3 · API: DM push fan-out
Reuse the provider-neutral notification port already in place. On every successful `send_dm` (HTTP or WS), fire an Expo push to the recipient when they're not currently connected to `dm:{a}:{b}`. DM request creation fires a separate "you have a new message request" push. Payloads carry the peer id so mobile can deep-link.

#### M1 · Mobile: wire InboxScreen to the API
Replace `MOCK_DMS` / `MOCK_REQUESTS` with React Query hooks (`useDmConversations`, `useDmRequests`) backed by a new `dms.api.ts`. Active / unread / archived chips hit the same conversations endpoint with the right filter; Solicitações hits the requests endpoint. Mutations: archive, unarchive, mark-read, approve-request, ignore-request — all optimistic with rollback. Delete `data.ts` and the no-op tap handlers.

#### M2 · Mobile: DmChatScreen
New screen mirroring `GroupChatScreen` (same screen pattern, same bubbles + day separators + composer). Reuse the chat primitives, extracting them to `src/shared/ui/chat/` if not already. Header: back, peer `Avatar` + display name + online dot, more menu (archive, block, report). `useDmChat(peerId)` combines `useInfiniteQuery` for history with the WS subscription and an optimistic `useSendDirectMessage`. Mark-as-read on mount and on each incoming message while focused. Nav route added to `AuthenticatedStack`; InboxScreen `onOpenDm` navigates here.

#### M3 · Mobile: realtime + push routing
`useDmInboxRealtime()` listens for `dm_summary_update` and refreshes the conversations cache so previews land without a refetch. `useDmPresence(peerId)` powers the chat-header online dot (mirrors `useGroupPresence`). Extend the existing push notification handler to route DM payloads to `DmChatScreen` with the right `peerId`. Handle the push-and-WS-for-the-same-message dedup case.

#### M4 · Mobile: DM requests UX
The Solicitações chip (already in the InboxScreen) wires to `useDmRequests`. `RequestRow`'s Aceitar / Ignorar buttons (already there) call the new mutations. Optional banner on Home when N requests are pending (matches the I5 prototype; not in scope unless we want it).

#### M5 · E2E
Maestro flows: send a DM, receive a DM in real time, approve a DM request, tap a DM push notification → `DmChatScreen` opens with the right thread. One flow per `dm_permission` value.

**Polish (Phase 5)** — block/unblock peer, report user, edit/delete own DM, media in DMs (depends on Phase 3 Slice 2 media upload), empty-state copy when the user has zero conversations and zero requests.

- [ ] API-backed user listing/search for Profile DM exceptions: needed before mobile can add new manual exceptions, because the app currently has no safe way to discover selectable peers beyond existing inbox/request data.

**Open decisions**

- ~~Inbox-list shape~~ — **Resolved 2026-05-18**: derived on the fly via `direct_messages` + `dm_conversation_state` (`listInbox` uses a `DISTINCT ON` CTE; see `direct-message.typeorm.repository.ts`). Re-evaluate if/when DM volume per user makes this query slow.
- ~~DM requests storage~~ — **Resolved 2026-05-18**: separate `dm_requests` table (ADR-006). Unique `(sender_id, recipient_id)` enforces one pending request per pair via UPSERT.
- Gateway: keep DM events on `ChatGateway` (current) vs. split into a `/dm` namespace. Split simplifies permission rules; current reuses the connection.
- Exception-list size cap: not enforced today. Revisit only if a user accumulates an unreasonable list (UX or storage cost).

### Phase 5 — Polish

- [ ] **HOME-8** Search polish: build the group-search screen and restore the Home search action; until then, remove/hide the current no-op search button on the next mobile branch that touches Home.
- [ ] Mobile polish: use the shared members icon instead of the literal `MEM` shorthand wherever the UI refers to group members.
- [ ] Moderation: soft-delete messages, ban flow
- [ ] Rate limiting (NestJS ThrottlerModule)
- [ ] LGPD: `DELETE /users/me` (account deletion, data erasure)
- [ ] Full E2E suite on CI (Maestro Cloud or local)
- [ ] Load testing on WebSocket gateway
- [ ] Fix: make `anchorLabel` optional on group creation — API allows null/empty; `CreateGroupScreen` removes the required-field validation on the anchor name input; existing groups with null label render the `AnchorType` display string as fallback everywhere a label is shown.

### RQ migration backlog (TD-09)

Pilot landed in Phase 3 Slice 1 (`useGroupChat`: `useInfiniteQuery` for history + optimistic `sendMessage`). Remaining migrations, each in its own `refactor/rq-<slug>` branch:

**HTTP cache — convert `useState + useEffect` fetch calls to `useQuery`**

- [x] `GroupDiscoveryScreen` → `useQuery(['groups', 'nearby', "lat,lng"], ...)` — landed as `useNearbyGroups` in the Home redesign (the screen itself was renamed to `HomeScreen`)
- [x] `GroupDetailScreen` → `useGroupDetail` (`useQuery`), `useGroupJoinRequests` (`useQuery`, privileged-gated), `useGroupMembers` (`useQuery`, limit 5) — all optimistic mutations too (join/leave/delete/ban/resolve/update)
- [x] `GroupMembersScreen` → redesign + React Query: active members via `useInfiniteQuery(['groups', 'members', groupId, 'active'], ...)`, banned users via a matching query/API shape, join requests via `useGroupJoinRequests` for approval-required groups only, plus unban mutation.
- [x] `GroupDetailScreen` pending requests → `useGroupJoinRequests` (`useQuery`, replaces `useFocusEffect` manual refetch)
- [ ] `GET /users/me` (currently only called inside auth flow) — wrap when a user-profile screen exists

**Optimistic mutations — convert to `useMutation` with `onMutate` / rollback**

- [ ] `joinGroup` — optimistic `myRole` flip (OPEN → member, APPROVAL_REQUIRED → local pending state)
- [ ] `leaveGroup` — optimistic removal + navigate on success
- [ ] `banMember` — optimistic removal from members list (already done manually — port to mutation)
- [ ] `unbanMember` — optimistic removal from banned list + optional restore path if the API returns the active member shape
- [ ] `resolveJoinRequest` — optimistic removal from pending list + `memberCount` bump on approve (already done manually — port to mutation)
- [ ] `updateUserProfile` (PATCH /users/me) — optimistic update of `useAuthStore` user; rollback on failure

### Future — DevOps / Infrastructure (low priority, learning track)

- [ ] Terraform: define all infrastructure as code (Render, Neon, GitHub secrets)
- [ ] Multiple environments (staging + production)
- [ ] iOS builds: set up Apple Developer account + EAS credentials for iOS CI

---

## Pending decisions blocking work

| ID | Decision | Blocks |
|----|----------|--------|
| ~~DP-01~~ | ~~Redis hosting for production (self-hosted vs Upstash)~~ — **Resolved 2026-05-01**: Upstash chosen | ~~Phase 2 cache, Phase 3 WebSocket pub-sub~~ |
| ~~DP-02~~ | ~~Push notification provider (Expo Push vs Firebase FCM)~~ — **Resolved 2026-05-13**: Expo Push first behind provider-neutral contracts; FCM can be added as a later adapter. | ~~Phase 4~~ |

---

## Technical debt

| ID | Description | Introduced | Priority |
|----|-------------|-----------|---------|
| ~~TD-01~~ | ~~`JwtStrategy` fallback secret~~ — **Fixed**: throws error if `JWT_SECRET` not set | Auth module | ~~High~~ |
| ~~TD-02~~ | ~~`packages/geo-utils` is empty~~ — **Fixed**: fully implemented + published as v1.1.0 | Phase 1 | ~~High~~ |
| ~~TD-03~~ | ~~`auth.api.ts` uses hardcoded `localhost:3000`~~ — **Fixed**: migrated to shared `apiClient` with env-based URL | Auth flow | ~~High~~ |
| ~~TD-04~~ | ~~Supabase URL + anon key hardcoded~~ — **Fixed**: reads from `EXPO_PUBLIC_*` env vars | Auth flow | ~~High~~ |
| ~~TD-05~~ | ~~Onboarding display name never persisted to backend~~ — **Fixed**: OnboardingScreen now calls PATCH /users/me and PATCH /users/me/location on finish | Onboarding | ~~High~~ |
| ~~TD-06~~ | ~~No 401 interceptor on `apiClient`~~ — **Fixed**: interceptor with refresh + retry queue + tests | Auth flow | ~~High~~ |
| ~~TD-07~~ | ~~No unit tests exist for any use case~~ — **Fixed (Phase 1 scope)**: all Phase 1 use cases and mobile screens have unit coverage. Integration tests still pending under Testing track. | All modules | ~~Medium~~ |
| ~~TD-08~~ | ~~`UpdateUserLocationUseCase` has no <300m no-op~~ — **Closed**: `updateLocation` is now called only once (onboarding); no repeated writes to deduplicate. Location freshness strategy moved to Phase 3 Slice 3. | ~~User module~~ | ~~Low~~ |
| TD-11 | API spec files duplicate repository mock builders — `buildGroupRepoMock` extracted to `src/modules/groups/test/group-repo.mock.ts` (done). Remaining: `IUserRepository` mock repeated across 7 specs in auth/user/messages modules → `src/modules/auth/test/user-repo.mock.ts`; `IMessageRepository` mock repeated across 3 messages specs → `src/modules/messages/test/message-repo.mock.ts`. | Test maintenance | Low |
| TD-09 | Mobile REST endpoints use ad-hoc `useState + useEffect` in every screen — no cache, no dedup, no optimistic updates. Decision: migrate to `@tanstack/react-query`. Phase 3 Slice 1 piloted it in `useGroupChat`; Home redesign expanded with `useNearbyGroups` (`HomeScreen`), and GroupDetailScreen is now migrated. Remaining surfaces (GroupMembersScreen redesign, CreateGroupScreen, profile fetch, and any leftover join/leave/ban/resolve/unban mutations) are listed under "RQ migration backlog" in Up next. | Phase 2 mobile | Medium |
| ~~TD-10~~ | ~~Auth response under-specifies the User shape~~ — **Fixed (`feat/td-10-auth-user-shape`)**: `@localloop/shared-types@1.3.0` exports `UserSummary`; backend `UserSummaryDto` and `UserProfileDto` both `implements UserSummary` (auth response now carries `dmPermission` + `createdAt`); mobile `User` interface re-exports `UserSummary` (drops the 4 dead fields `providerId`/`geohash`/`isActive`/`lastSeenAt`) and `auth.api.ts:mapToAuthResponse` is a direct pass-through. | Auth flow | ~~Medium~~ |
| TD-12 | Messages module consolidation — group chat sends only via WebSocket, DM sends via HTTP+WebSocket. Nearly identical `SendMessageUseCase` logic, entity, and policy enforcement in two modules. Consolidate to single use case or add HTTP POST to group chat to make both symmetric. Blocks media-messaging and edit features if left unaddressed. | Phase 3 Slice 1 + Phase 4 DM API | Medium |
| TD-13 | `MessagesModule` ↔ `DirectMessagesModule` are coupled both ways and only boot because of `forwardRef` on both sides. Edge 1 (preexisting): `ChatGateway` injects `SendDirectMessageUseCase`. Edge 2 (added by DM-TASK-C): `DirectMessagesController` injects `ChatGateway` to emit `dm_request_accepted` after the HTTP accept handler. `forwardRef` fixes the boot-order symptom but the architectural cycle remains — modules can't be reused/tested independently and a `ChatGateway` constructor change can break the DM controller at boot rather than edit time. **Option 1 (port/adapter)**: define `IDmEventEmitter` in DirectMessages domain, `ChatGateway` implements it, controller injects the interface token — DM no longer imports MessagesModule. Cycle gone. **Option 2 (extract gateway)**: move `ChatGateway` to a new `RealtimeModule` that neither Messages nor DirectMessages depends on, both consume it. Cleanest seam, biggest change. Re-evaluate when DM-TASK-E/F add more gateway emit paths from the DM controller — that's the trigger to pick one. | DM-TASK-C wiring | Medium |

---

## Known issues

| ID | Description | Severity | Discovered |
|----|-------------|----------|-----------|
| ~~BUG-01~~ | ~~`docker-compose.yml` has no Redis service~~ — **Fixed**: Redis 7 Alpine service added alongside PostGIS | ~~Medium~~ | 2026-04-15 |
