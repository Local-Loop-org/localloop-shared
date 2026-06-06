# Project — closed work

> Sections that are fully shipped, archived out of `status.md` to keep it lean.
> When a section in `status.md` shows a one-line summary, the original
> checklist lives here.
>
> Detailed dated branch summaries live in [`history.md`](./history.md);
> this file groups closed work by phase/slice instead of by date.

---

## Phase 1 — Complete Foundation ✅

**1. Cleanup**

- [x] Move Supabase URL + anon key to env vars (`EXPO_PUBLIC_*`)
- [x] Unify HTTP layer: `auth.api.ts` migrated to shared `apiClient` (axios, env-based URL)
- [x] 401 interceptor on `apiClient` — refresh + retry queue + test coverage

**2. Backend — Phase 1 endpoints**

- [x] `RefreshTokenUseCase` + `POST /auth/refresh`
- [x] UserModule: `GET /users/me`, `PATCH /users/me` (display name, dm_permission)
- [x] `PATCH /users/me/location` (coordinate → geohash via geo-utils)
- [x] `packages/geo-utils`: coordinate→geohash, 8 neighbor cells, proximity label generation (v1.1.0)

**3. Mobile — Phase 1 wiring**

- [x] OnboardingScreen: call `PATCH /users/me` to persist display name to backend
- [x] OnboardingScreen: call `PATCH /users/me/location` after granting permission
- [x] Update `apiClient` base URL from hardcoded to env var

**4. Infrastructure**

- [x] Add Redis service to `docker-compose.yml`
- [x] Fix `JwtStrategy` fallback secret (TD-01) — throw error if `JWT_SECRET` not set

---

## CI/CD ✅

**API — GitHub Actions**

- [x] Workflow: `lint → unit tests → integration tests → docker build → Render deploy hook`
- [x] Trigger: push to `main`, PRs targeting `main`
- [x] Deploy: Render (free tier) triggered via deploy hook after CI passes

**Mobile — GitHub Actions**

- [x] Workflow: `lint → type-check → unit tests → EAS Build APK → GitHub Release` (Android only)
- [x] Trigger: push to `main`, PRs targeting `main` (release step gated to push-on-main)
- [x] Delivery: APK attached to a GitHub Release tagged `build-<run_number>` — sideload from the Releases page on the device
- [x] iOS builds deferred until Apple Developer account is set up

**Shared — GitHub Actions**

- [x] Workflow: `lint → build → npm publish` (auto-publish on push to main)

---

## Phase 2 — Groups (closed slices)

**Vertical slice — create + discover + join** ✅

- [x] Migration: `groups`, `group_members`, `group_join_requests` tables
- [x] GroupsModule: `CreateGroupUseCase`, `DiscoverNearbyGroupsUseCase`, `GetGroupDetailUseCase`, `JoinGroupUseCase`, `ListJoinRequestsUseCase`
- [x] Mobile: `CreateGroupScreen`, `GroupDiscoveryScreen`, `GroupDetailScreen`, `AuthenticatedStack`

**Moderation slice — leave + approve/reject + ban + members listing** ✅

- [x] `LeaveGroupUseCase` + `DELETE /groups/:id/members/me` (owner-can't-leave rule)
- [x] `ResolveJoinRequestUseCase` (single use case handling approve/reject via `action` field) + `BanMemberUseCase`
- [x] Endpoints: `PATCH /groups/:id/requests/:requestId`, `DELETE /groups/:id/members/:userId`, `GET /groups/:id/members` (paginated)
- [x] Mobile: `GroupMembersScreen` + moderation UI (approve/reject/ban) wired in `GroupDetailScreen`

**Phase 2 misc closed items**

- [x] `DeleteGroupUseCase` + `DELETE /groups/:id` (owner-only; cascades members, requests, messages). Mobile UI (owner action sheet + optimistic removal) deferred to separate mobile branch.
- [x] Unit tests for all Phase 2 use cases, mobile screens, hook, api module

---

## Phase 3 — Chat (closed slices)

**Slice 1 — Text chat** ✅

- [x] Migration: `messages` table
- [x] MessagesModule: `GetMessageHistoryUseCase`, `SendMessageUseCase`
- [x] WebSocket gateway (Socket.IO) + Redis adapter for pub-sub
- [x] Mobile: `GroupChatScreen` (real-time, optimistic sends via React Query)
- [x] Unit tests: use cases, gateway, hook, screen

**Slice 3 — Message permissions (partial)**

- [x] Shared: add `MessagePermission` enum (`ADMIN_ONLY`, `MEMBERS_IN_RADIUS`, `ALL_MEMBERS`) to `@localloop/shared-types` (minor bump).

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

---

## Home redesign — closed items

Slice 1 (`HomeScreen` + sectioned discovery + presentational bottom tabs) is implemented on `feat/home-redesign`. The items below extended it incrementally.

- [x] **HOME-2** API: `GET /groups/me` (paginated; returns `id`, `name`, `anchorType`, `anchorLabel`, `memberCount`, `myRole`; include `lastMessage` summary + `unreadCount` + `lastReadAt` if scope allows). Unblocks the "Meus grupos" pinned section.
- [x] **HOME-3** Mobile: render the "Meus grupos" pinned section once HOME-2 ships. Wires `useMyGroups` (React Query) + renders above the discovery sections.
- [x] **HOME-4** Mobile: real `@react-navigation/bottom-tabs` navigator wrapping the home stack. Stub `InboxScreen`, `MapScreen`, `ProfileScreen` (each a centered "em breve" panel). Move logout from the header `more` action sheet to `ProfileScreen`.
- [x] **HOME-5** API + mobile: live presence on Home cards/rows. API `/chat` has read-only `watch_presence` / `unwatch_presence` observer rooms; Home observes counts without inflating them. Mobile shows a green dot on "Meus grupos", a compact live count badge on horizontal cards, and `N Online` on vertical rows.
- [x] **HOME-6** API + mobile: distance string ("210M") on `NearbyGroup` (API returns meters; mobile formats `<n>M` / `<n>Km`). Replaces `proximityLabel` on cards. (`feat/home-6-distance-meters`)
- [x] **HOME-7** Mobile: "Ver todos →" detail screens — one per section (`GroupListByTypeScreen`) showing all groups of a single anchor type with infinite scroll. Adds a "Ver todos" entry for "Meus grupos" using `useMyGroups(limit=50)` / `useInfiniteQuery`. Reuses or extracts `MyGroupRow` from `HomeScreen/layout/MyGroupRow.tsx`.
- [x] **HOME-9** API + mobile: full membership status on discovery cards. (`feat/home-9-membership-status`)
- [x] **HOME-10** API + mobile: configurable discovery radius with mobile UI. (`feat/home-10-radius` + `feat/home-10-mobile-radius`)
- [x] **HOME-11** API + mobile: My Groups freshness. `GET /groups/me` supplies `unreadCount`, `lastReadAt`, and `lastMessage`; one shared `MyGroupRow` is reused by Home and `MyGroupsScreen`; unread badges render from persisted counts; `/chat` emits user-specific `group_summary_update` events so new messages refresh the preview without waiting for a refetch.

---

## Phase 4 — DMs + Push Notifications

**Foundation**

- [x] Resolve DP-02: Expo Push first behind a provider-neutral API/mobile boundary, with future FCM adapter support.
- [x] Push notification initial setup: shared contracts, `push_devices`, user permission status, API registration/preference endpoints, and provider port + Expo adapter.
- [x] Mobile push registration handling: Home asks once when `pushPermissionStatus = null`; Profile toggle owns later enable/disable changes.
- [x] Group message push fan-out: best-effort Expo push for active offline group members, excluding sender and users connected to `group:{groupId}`.
- [x] Migration: `direct_messages` table — `1717000000000-CreateDirectMessages` (functional `idx_dm_conversation` index + `chk_dm_distinct_participants` check).
- [x] Migration: `dm_requests`, `dm_conversation_state`, `dm_permission_exceptions` — `1717100000000-AddDmInboxSupport`.
- [x] DMModule: `SendDirectMessageUseCase` + `GetDirectMessageHistoryUseCase` + `ListDmConversationsUseCase` + `ListDmRequestsUseCase`. Send returns the discriminated union (`{type:'message'} | {type:'request', requestId}`) via `routeDm` (`hasPermissionException` short-circuit, then `dm_permission` + `IGroupRepository.hasSharedActiveGroup` for `MEMBERS`); blocked sends UPSERT into `dm_requests`. `ChatGateway` extended with `join_dm`/`leave_dm`/`send_dm` and broadcasts into `dm:{sortedA}:{sortedB}`. HTTP: `GET`/`POST /dm/:userId`, `GET /dm`, `GET /dm/requests`. Media DMs rejected in v1 (`MEDIA_DM_NOT_SUPPORTED`).
- [x] Spec: `architecture.md` "Direct messages (Phase 4)" + ADR-006 + the cross-doc consolidation (2026-05-18, `docs/direct-message-flow`).

### DM flow alignment — all 8 tasks shipped

The 2026-05-18 doc consolidation (`docs/direct-message-flow`) enumerated 12 gaps in `architecture.md` → "Direct messages (Phase 4)" → "Open gaps". The 12 gaps + archive endpoints were grouped into 8 tasks below by shared entity/file touchpoint; each task landed in its own PR. Branch-level detail per task lives in [`history.md`](./history.md).

##### DM-TASK-A · Send-side enrichments ✅
**Touches:** `SendDirectMessageUseCase`, `dm_permission_exceptions`, `dm_conversation_state`. **Closes:** Gap 1, Gap 11.

- [x] Write `exception(sender, recipient)` on successful direct delivery (idempotent `INSERT … ON CONFLICT DO NOTHING`). No-op on the request path. **(Gap 1)**
- [x] Eager-init `dm_conversation_state(sender, recipient)` with `last_read_at = now()` on send (sender's row only — recipient's row stays lazy). **(Gap 11)**
- [x] Unit tests cover: direct-delivery writes both rows; request-route writes neither; idempotency on repeat sends.

##### DM-TASK-B · `send_dm` gateway result-type branching ✅
**Touches:** `ChatGateway.onSendDm`. **Closes:** Gap 4.

- [x] Branch on `result.type` in `onSendDm`.
- [x] `message` → keep current `new_direct_message` broadcast into `dm:{sortedA}:{sortedB}`.
- [x] `request` → emit `dm_request_sent { requestId }` to sender's own socket only; no room broadcast.
- [x] Add `DM_REQUEST_SENT` constant to `@localloop/shared-types` chat-socket events (minor bump).
- [x] Gateway spec covers both branches + the no-leak property (room sockets never see a request payload).

##### DM-TASK-C · Accept/decline request flow + WS feedback ✅
**Touches:** new `AcceptDmRequestUseCase` + `DeclineDmRequestUseCase`, `dm_requests`, `direct_messages`, `dm_permission_exceptions`, `ChatGateway`. **Closes:** Gap 2, Gap 5.

- [x] `AcceptDmRequestUseCase` — single transaction: insert `direct_messages` row from held `dm_requests.content` with original `created_at`, write `exception(recipient, sender)`, eager-init `dm_conversation_state` for sender, delete `dm_requests` row.
- [x] `DeclineDmRequestUseCase` — delete `dm_requests` row only.
- [x] `POST /dm/requests/:id/accept` and `POST /dm/requests/:id/decline` endpoints (recipient-only; non-recipient → 404 to hide existence).
- [x] Emit `dm_request_accepted` to every connected socket of the original sender (multi-device safe; iterates `server.fetchSockets()` filtering by `socket.data.user.id`).
- [x] Add `DM_REQUEST_ACCEPTED` constant to `@localloop/shared-types` chat-socket events.
- [x] Tests: accept tx atomicity (rollback covered by the transaction wrapper), decline idempotency, accept-then-accept returns 404 (row already gone), sender receives WS event on accept, no leak to other users or DM-room observers.

##### DM-TASK-D · Manual exception management endpoints ✅
**Touches:** new `*DmExceptionUseCase` trio + controller, `dm_permission_exceptions`. **Closes:** Gap 3.

- [x] `ListDmExceptionsUseCase` + `GET /users/me/dm-exceptions` (paginated peer list joined to `users`; inactive peers filtered out; cursor `(createdAt, peerId)`).
- [x] `AddDmExceptionUseCase` + `PUT /users/me/dm-exceptions/:peerId` (idempotent UPSERT via `ON CONFLICT DO NOTHING`; self-pair → 400 `CANNOT_EXCEPTION_SELF`; missing or inactive peer → 404 `PEER_NOT_FOUND`).
- [x] `RemoveDmExceptionUseCase` + `DELETE /users/me/dm-exceptions/:peerId` (idempotent DELETE; self-pair → 400; returns 204 even if no row matched).
- [x] Tests: add/remove idempotency, self-pair rejection, pagination correctness (5 list + 5 add + 4 remove specs).

##### DM-TASK-E · Inbox liveness + per-conversation state mutations ✅
**Touches:** `ChatGateway`, `dm_conversation_state`, new HTTP archive endpoints, all DM mutation paths. **Closes:** Gap 6, Gap 7, archive endpoints.

- [x] `mark_dm_read { peerId }` WS event + use case: upsert `dm_conversation_state(caller, peer).last_read_at = now()`.
- [x] `PUT /dm/:userId/archive` and `DELETE /dm/:userId/archive` endpoints: upsert `dm_conversation_state.archived`.
- [x] `watch_dm_inbox` / `unwatch_dm_inbox` WS events (user-scoped subscription, no payload).
- [x] Define `dm_summary_update` payload (mirror `group_summary_update`).
- [x] Emit `dm_summary_update` from every mutation path: new message delivered (Task A's send path), accept-request promotion (Task C), mark-read, archive/unarchive.
- [x] Add `MARK_DM_READ` / `WATCH_DM_INBOX` / `UNWATCH_DM_INBOX` / `DM_SUMMARY_UPDATE` constants to `@localloop/shared-types`.
- [x] Tests: mark-read clears `unreadCount` on the next emit; archive does NOT clear unread; subscription is user-scoped (no cross-user leak).

##### DM-TASK-F · DM push fan-out + WS dedup ✅
**Touches:** `ChatGateway`, notifications module, push provider port. **Closes:** Gap 9, Gap 10.

- [x] After successful direct delivery in `onSendDm`, fire best-effort Expo push to recipient's enabled devices.
- [x] Skip the push if recipient has any socket joined to `dm:{sortedA}:{sortedB}` (server-side WS dedup, mirrors group fan-out's skip rule).
- [x] Do NOT fire push on acceptance (per design — sender gets `dm_request_accepted` WS event instead).
- [x] Payload carries `peerId` for mobile deep-link routing to `DmChatScreen`.
- [x] Tests: push fires when recipient offline; skipped when in the dm room; not fired on accept.

##### DM-TASK-G · Deactivated-peer placeholder ✅
**Touches:** `listInbox` SQL, possibly `findByIdWithSender` and other read paths. **Closes:** Gap 8.

- [x] `listInbox` SQL substitutes `peer_name = 'Conta desativada'` and `peer_avatar_url = NULL` when joined `users.is_active = false`.
- [x] Audit other read endpoints (`GET /dm/:userId`, `GET /dm/requests`) for the same substitution; apply consistently. Same `CASE WHEN <alias>.is_active = false …` templated into `listRequests`, `getDmSummary` (last-sender preview), `baseQuery()` (used by `findByIdWithSender` + `listConversation` for history), and `acceptRequestAtomic`'s final SELECT. `listExceptions` intentionally untouched — filters inactive peers out per Gap 3 spec.
- [x] Relax `GetDirectMessageHistoryUseCase`'s `!recipient.isActive` rejection so the inbox row's placeholder is tappable end-to-end (still 404 on `!recipient`). Send still 404s on inactive recipients per spec.
- [x] Tests: deactivated peer still appears in inbox with placeholder; messages still readable. Five new repo specs assert the CASE clause on each substitution site; use-case spec swaps "rejects on inactive" for "returns history on inactive".

##### DM-TASK-H · DTO naming standardization (breaking, cross-repo) ✅
**Touches:** `@localloop/shared-types` `DirectMessage`, API DTOs, mobile types. **Closes:** Gap 12.

- [x] Rename `DirectMessageRow.senderAvatar` → `senderAvatarUrl` in API. Extended to the group `Message` types (`MessageRow`, send/history DTOs + mappers, `message.typeorm.repository.ts`) for chat-surface symmetry.
- [x] Update `@localloop/shared-types` `DirectMessage.senderAvatarUrl` — **major bump to 2.0.0** (mobile actively consumes the field via `PeerBubble`).
- [x] Coordinate with mobile branch consuming the same shape (in-flight `feat/dm-chat-entrypoints` + `feat/dm-mobile-requests` rebase after this lands).
- [x] Land all three repos in lockstep on the `feat/dm-task-h-avatar-rename` slug.

### Inbox + DM chat flow — closed slices

#### S1 · API: inbox-list + request endpoints ✅
Shipped on `feat/dm-inbox-api` ([api#23](https://github.com/Local-Loop-org/localloop-api/pull/23)). `GET /dm` + `GET /dm/requests` with cursor pagination; `SendDirectMessageUseCase` routes to `dm_requests` on permission mismatch; three new tables (`dm_requests`, `dm_conversation_state`, `dm_permission_exceptions`).

#### S2 · API: realtime inbox summary events ✅
Shipped via DM-TASK-E. `ChatGateway` handles `watch_dm_inbox` / `unwatch_dm_inbox` and emits `dm_summary_update` on every DM mutation path (send, accept, mark-read, archive/unarchive). Tests cover the user-scoped no-leak property.

#### S3 · API: DM push fan-out ✅
Shipped via DM-TASK-F. On successful direct delivery, fires Expo push to recipient's enabled devices unless they have a socket joined to `dm:{sortedA}:{sortedB}` (server-side WS dedup). No push on request creation or accept (sender gets `dm_request_accepted` WS event instead). Payload carries `peerId` for deep-linking — pending consumer in M3 (see `status.md`).

#### M1 · Mobile: wire InboxScreen to the API ✅
`InboxScreen` consumes `useDmConversations` + `useDmRequests` + `useDmInboxRealtime` (focus-gated). Active / unread / archived chips filter the conversations query; Solicitações renders `useDmRequests`. `dm.api.ts` + the archive/unarchive/accept/decline mutation hooks are all in place.

#### M2 · Mobile: DmChatScreen ✅
`DmChatScreen` registered as `StackRoutes.DmChat` in [AuthenticatedStack.tsx](../../localloop-mobile/src/presentation/navigation/AuthenticatedStack.tsx). `useDmChat(peerId)` drives history + WS subscription + optimistic send; the layout renders peer `Avatar`, display name, presence status, bubbles + day separators + composer; archive/unarchive wired into the header's "more" action sheet.

#### M3 · Mobile: peer presence + push routing ✅
`useDmPresence(peerId)` subscribes to `watch_dm_presence`, consumes `dm_presence_update`, and feeds `DmChatLayout.peerStatus`. Push tap routing is also closed: mobile registers one notification response listener, handles cold-start responses, routes group/DM pushes, dismisses notifications matching the active chat, and suppresses foreground duplicates covered by the active chat or WebSocket message ids.

#### M4 · Mobile: DM requests UX ✅
`useAcceptDmRequest` + `useDeclineDmRequest` (both with optimistic removal + rollback) back the Solicitações rows. Optional "N pending requests" banner on Home is deferred unless we decide to add it.

### DM-exception-candidates (shared + mobile + API) ✅

- [x] **Shared/mobile:** `feat/dm-exception-candidates` (2026-05-20). `@localloop/shared-types@2.1.0` adds `DmExceptionCandidate` + `ListDmExceptionCandidatesResponse`; mobile adds `dmApi.listDmExceptionCandidates` + `dmApi.addDmException` + `useDmExceptionCandidates` (debounced) + `useAddDmException` (optimistic). Rendered inline inside the `DMPicker` exceptions section.
- [x] **API:** `feat/dm-exception-candidates-api` (2026-05-21). `GET /users/me/dm-exception-candidates` returns active users who share at least one ACTIVE group membership with the caller and are not already on the caller's `dm_permission_exceptions` list. `IDirectMessageRepository.listExceptionCandidates` + `parseStringIdCursor` helper.

---

## Chat features batch — closed clusters

### Cluster B · DM peer state ✅

- [x] DM read-state exposure: `GET /dm` carries caller `lastReadAt`; `GET /dm/:userId` carries caller `lastReadAt` + `peerLastReadAt`.
- [x] `dm_read_receipt` contract and realtime emission shipped through `@localloop/shared-types`, API WS, and mobile cache updates.
- [x] Mobile derives own-message states (`sending`, `sent`, `read`) from optimistic temps and peer read watermarks, then renders checkmark glyphs in own DM bubbles.
- [x] DM peer presence (`watch_dm_presence` / `dm_presence_update`) feeds the DM chat header online state.

### Cluster C · Message lifecycle: reply + delete + edit ✅

- [x] Shared/API contracts expose `replyTo`, `isDeleted`, and `editedAt` on group and DM messages.
- [x] Reply support validates same-conversation, non-deleted parent messages and sends `replyToMessageId` over HTTP/WS paths.
- [x] Soft delete ships for group and DM messages with realtime delete events and durable tombstone history.
- [x] Edit ships for own messages only, with HTTP routes, realtime edit events, mobile edit composer, optimistic swap/rollback, and the visible `editado` suffix.

### Cluster E · Send-failure + retry ✅

- [x] Mobile optimistic temps carry local-only `sendStatus: 'sending' | 'sent' | 'error'` and preserve stable `clientMessageId` echo reconciliation.
- [x] Send failures and ack timeouts leave the bubble in place as `error` instead of removing it.
- [x] Failed bubbles render the "Não enviada" / retry treatment, tap retry re-emits with the same `clientMessageId`, and long-press "Descartar" removes the failed temp from the React Query cache.

---

## TD-09 React Query migration — closed items

Pilot landed in Phase 3 Slice 1 (`useGroupChat`: `useInfiniteQuery` for history + optimistic `sendMessage`). Closed migrations:

- [x] `GroupDiscoveryScreen` → `useQuery(['groups', 'nearby', "lat,lng"], ...)` — landed as `useNearbyGroups` in the Home redesign (the screen itself was renamed to `HomeScreen`)
- [x] `GroupDetailScreen` → `useGroupDetail` (`useQuery`), `useGroupJoinRequests` (`useQuery`, privileged-gated), `useGroupMembers` (`useQuery`, limit 5) — all optimistic mutations too (join/leave/delete/ban/resolve/update)
- [x] `GroupMembersScreen` → redesign + React Query: active members, banned users, and join requests are backed by query hooks, with ban/unban/role/resolve mutations. Full infinite pagination beyond the current 50-row view is deferred to Phase 5 polish.
- [x] `GroupDetailScreen` pending requests → `useGroupJoinRequests` (`useQuery`, replaces `useFocusEffect` manual refetch)
- [x] `GET /users/me` → `useUserProfile` (`useQuery`) and `PATCH /users/me` → `useUpdateUserProfile` (`useMutation` with optimistic cache update + rollback).

---

## Resolved decisions

- ~~DP-01~~ Redis hosting for production (self-hosted vs Upstash) — **Resolved 2026-05-01**: Upstash chosen.
- ~~DP-02~~ Push notification provider (Expo Push vs Firebase FCM) — **Resolved 2026-05-13**: Expo Push first behind provider-neutral contracts; FCM can be added as a later adapter.
- ~~Inbox-list shape~~ — **Resolved 2026-05-18**: derived on the fly via `direct_messages` + `dm_conversation_state` (`listInbox` uses a `DISTINCT ON` CTE; see `direct-message.typeorm.repository.ts`). Re-evaluate if/when DM volume per user makes this query slow.
- ~~DM requests storage~~ — **Resolved 2026-05-18**: separate `dm_requests` table (ADR-006). Unique `(sender_id, recipient_id)` enforces one pending request per pair via UPSERT.

---

## Closed technical debt

- ~~TD-01~~ `JwtStrategy` fallback secret — **Fixed**: throws error if `JWT_SECRET` not set.
- ~~TD-02~~ `packages/geo-utils` is empty — **Fixed**: fully implemented + published as v1.1.0.
- ~~TD-03~~ `auth.api.ts` uses hardcoded `localhost:3000` — **Fixed**: migrated to shared `apiClient` with env-based URL.
- ~~TD-04~~ Supabase URL + anon key hardcoded — **Fixed**: reads from `EXPO_PUBLIC_*` env vars.
- ~~TD-05~~ Onboarding display name never persisted to backend — **Fixed**: OnboardingScreen now calls `PATCH /users/me` and `PATCH /users/me/location` on finish.
- ~~TD-06~~ No 401 interceptor on `apiClient` — **Fixed**: interceptor with refresh + retry queue + tests.
- ~~TD-07~~ No unit tests exist for any use case — **Fixed (Phase 1 scope)**: all Phase 1 use cases and mobile screens have unit coverage. Integration tests still pending under the testing backlog.
- ~~TD-08~~ `UpdateUserLocationUseCase` has no <300m no-op — **Closed**: `updateLocation` is now called only once (onboarding); no repeated writes to deduplicate. Location freshness strategy moved to Phase 3 Slice 3.
- ~~TD-09~~ Mobile REST endpoints used ad-hoc `useState + useEffect` instead of React Query — **Closed**: server-state reads and visible mutations now use React Query hooks across the shipped mobile surfaces. The remaining Home open-group join issue is tracked as a focused UX fix in `status.md`; large-list pagination beyond the current 50-row views is Phase 5 polish in `backlog.md`.
- ~~TD-11~~ API spec files duplicate repository mock builders — **Closed (`refactor/td-11-user-repo-mock`)**: the `IUserRepository` mock is now a single canonical `buildUserRepoMock` (plus the `buildUser` entity helper) at `src/modules/auth/test/user-repo.mock.ts`, alongside the already-extracted `buildGroupRepoMock`/`buildMessageRepoMock`. Relocated from its prior wrong-module home (`direct-messages/test/`, now deleted — no re-export shim); the 6 auth/user specs that hand-rolled the 5-method literal and the 3 DM specs now all import the shared builder. The 3 specs needing `save` to echo its argument add a one-line `userRepo.save.mockImplementation(...)` override. API suite green at 60 / 426; `tsc` clean.
- ~~TD-10~~ Auth response under-specifies the User shape — **Fixed (`feat/td-10-auth-user-shape`)**: `@localloop/shared-types@1.3.0` exports `UserSummary`; backend `UserSummaryDto` and `UserProfileDto` both `implements UserSummary` (auth response now carries `dmPermission` + `createdAt`); mobile `User` interface re-exports `UserSummary` (drops the 4 dead fields `providerId`/`geohash`/`isActive`/`lastSeenAt`) and `auth.api.ts:mapToAuthResponse` is a direct pass-through.
- ~~TD-13~~ `MessagesModule` ↔ `DirectMessagesModule` cycle — **Fixed (`refactor/realtime-module`)**: `ChatGateway` is owned by `RealtimeModule`; `MessagesModule` exports only group-message use cases; `DirectMessagesModule` emits HTTP-triggered realtime side effects through `RealtimeEventsModule`; no `forwardRef` remains between Messages and DirectMessages. Gateway behavior is split across realtime services while `/chat` event names, room names, and payloads remain unchanged.

---

## Closed known issues

- ~~BUG-01~~ `docker-compose.yml` has no Redis service — **Fixed** 2026-04-15: Redis 7 Alpine service added alongside PostGIS.
