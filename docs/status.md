# Project Status

> Keep this file updated at the end of every session.
> This is the first file any agent reads to understand where the project is.

---

## Current phase

**Phase 4 DM flow alignment closed.** DM-TASK-A through DM-TASK-H shipped (atomic direct delivery, `send_dm` result-type branching, accept/decline request flow + `dm_request_accepted` WS event, manual exception management, inbox liveness with `dm_summary_update`, DM push fan-out + WS dedup, deactivated-peer placeholder, `senderAvatar` → `senderAvatarUrl` rename at shared 2.0.0). The DM-exception-candidates contract (shared 2.1.0 + mobile picker) is also fully wired with the matching API endpoint now live — see top entry in "Last updated". **Open work**: Phase 3 Slice 3 message permissions (shared enum published; API enforcement + mobile gating remain), DM mobile chat surfaces (M2/M3 — `DmChatScreen` + push tap handler), GroupMembersScreen redesign, Phase 3 Slice 2 media upload, HOME-12 Map, Phase 2 Redis cache. HOME-8 search remains Phase 5 Polish.

---

## Last updated

> Only the latest entries live here. Prior entries are archived in [`history.md`](./history.md).

2026-05-21 — DM-exception-candidates API shipped on `feat/dm-exception-candidates-api` (API only — no shared bump). `GET /users/me/dm-exception-candidates` returns active users who share at least one ACTIVE group membership with the caller and are not already on the caller's `dm_permission_exceptions` list, ordered by `lower(display_name) ASC, user_id ASC` with optional case-insensitive substring `q` (server trims, `@MaxLength(100)`) and keyset cursor `(displayName, userId)`. Implementation lives on the DM side: new `IDirectMessageRepository.listExceptionCandidates` joins `users` + `EXISTS (group_members self ⨝ peer ACTIVE)` + `NOT EXISTS dm_permission_exceptions`, mirrors the `limit + 1` pagination pattern from `listExceptions`. New `parseStringIdCursor(raw, f1, f2)` helper in `cursor.utils.ts`. `DmExceptionsController` rebased from `@Controller('users/me/dm-exceptions')` to `@Controller('users/me')` with per-method paths so the existing list/PUT/DELETE routes are unchanged while the new `@Get('dm-exception-candidates')` lives in the same class. Verification: 50/50 suites, 330/330 tests (+19 — 8 use-case + 6 repo + 5 cursor-utility), lint + build clean. Picker on mobile will now succeed instead of rendering "Indisponível no momento" once Render deploys. Closes the Phase 4 → DM-exception-candidates API gap.

2026-05-20 — DM-exception-candidates contract pinned on `feat/dm-exception-candidates` (shared + mobile). `@localloop/shared-types@2.1.0` adds `DmExceptionCandidate { userId, displayName, avatarUrl }` and `ListDmExceptionCandidatesResponse { data, next_cursor }` — narrower than `UserSummary` (no `dmPermission`/`createdAt`/`pushPermissionStatus` leakage). Mobile bumps `@localloop/shared-types@^2.1.0` and adds `dmApi.listDmExceptionCandidates` + `dmApi.addDmException`, two new hooks (`useDmExceptionCandidates` with 250ms debounced `q`, `useAddDmException` with optimistic prepend + rollback), and inline rendering inside the `DMPicker` exceptions section. **Mobile DM-TASK-H rename bundled here**: same branch carries the deferred mobile portion of DM-TASK-H (renames `ChatMessage.senderAvatar` across `messages.api.ts`, both `createOptimisticMessage` helpers, `PeerBubble`, `GroupChatScreen` + `InboxScreen` + `useAcceptDmRequest` mappers + spec fixtures) so mobile can pull `@localloop/shared-types@^2.x`. DM-TASK-H closed cross-repo.

2026-05-20 — DM-TASK-H shipped on `feat/dm-task-h-avatar-rename` (shared + API; mobile portion bundled with the DM-exception-candidates branch above). `@localloop/shared-types@2.0.0` (first major bump) renames `DirectMessage.senderAvatar` → `senderAvatarUrl`, extended to the group `Message` types so the whole chat surface (DM + group, HTTP + WS) lands consistent. SQL aliases (`u_avatar_url`, `up_avatar_url`, `us_avatar_url`) stay — they mirror `users.avatar_url` and never appear on the wire. Push payloads carry no avatar field and are unaffected. API: bumps `@localloop/shared-types@^2.0.0`, rename spans the DM module + group messages module (18 spec assertions updated across 6 files). Docs: `architecture.md` gap 12 marked closed; `api-contracts.md` flips all 8 `senderAvatar` references and drops the transitional comments on WS `new_direct_message` + `dm_request_accepted`.

---

## In progress

Phase 4 DM flow alignment Tasks A–H closed; the entire chat surface (DM + group, HTTP + WS) uses `senderAvatarUrl` consistently and `@localloop/shared-types` is at 2.0.0. With the alignment track done, next natural picks: the mobile push tap handler (M3 — no `addNotificationResponseReceivedListener` exists in the app yet; needed for both group and DM push deep-linking), or the DM mobile chat surfaces (M2 — `DmChatScreen` + S3/M3 push routing). Phase 3 Slice 3 message permissions also mid-flight: shared enum published (step 1/3); API migration + `SendMessageUseCase` enforcement (step 2/3) and mobile composer gating (step 3/3) remain. Other candidates: GroupMembersScreen redesign, HOME-12 Map, Phase 3 Slice 2 media upload, Phase 2 Redis cache. HOME-8 search deferred to Phase 5 Polish.

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

- [x] `mark_dm_read { peerId }` WS event + use case: upsert `dm_conversation_state(caller, peer).last_read_at = now()`.
- [x] `PUT /dm/:userId/archive` and `DELETE /dm/:userId/archive` endpoints: upsert `dm_conversation_state.archived`.
- [x] `watch_dm_inbox` / `unwatch_dm_inbox` WS events (user-scoped subscription, no payload).
- [x] Define `dm_summary_update` payload (mirror `group_summary_update`).
- [x] Emit `dm_summary_update` from every mutation path: new message delivered (Task A's send path), accept-request promotion (Task C), mark-read, archive/unarchive.
- [x] Add `MARK_DM_READ` / `WATCH_DM_INBOX` / `UNWATCH_DM_INBOX` / `DM_SUMMARY_UPDATE` constants to `@localloop/shared-types`.
- [x] Tests: mark-read clears `unreadCount` on the next emit; archive does NOT clear unread; subscription is user-scoped (no cross-user leak).

##### DM-TASK-F · DM push fan-out + WS dedup
**Touches:** `ChatGateway`, notifications module, push provider port. **Closes:** Gap 9, Gap 10.

- [x] After successful direct delivery in `onSendDm`, fire best-effort Expo push to recipient's enabled devices.
- [x] Skip the push if recipient has any socket joined to `dm:{sortedA}:{sortedB}` (server-side WS dedup, mirrors group fan-out's skip rule).
- [x] Do NOT fire push on acceptance (per design — sender gets `dm_request_accepted` WS event instead).
- [x] Payload carries `peerId` for mobile deep-link routing to `DmChatScreen`.
- [x] Tests: push fires when recipient offline; skipped when in the dm room; not fired on accept.

##### DM-TASK-G · Deactivated-peer placeholder
**Touches:** `listInbox` SQL, possibly `findByIdWithSender` and other read paths. **Closes:** Gap 8.

- [x] `listInbox` SQL substitutes `peer_name = 'Conta desativada'` and `peer_avatar_url = NULL` when joined `users.is_active = false`.
- [x] Audit other read endpoints (`GET /dm/:userId`, `GET /dm/requests`) for the same substitution; apply consistently. Same `CASE WHEN <alias>.is_active = false …` templated into `listRequests`, `getDmSummary` (last-sender preview), `baseQuery()` (used by `findByIdWithSender` + `listConversation` for history), and `acceptRequestAtomic`'s final SELECT. `listExceptions` intentionally untouched — filters inactive peers out per Gap 3 spec.
- [x] Relax `GetDirectMessageHistoryUseCase`'s `!recipient.isActive` rejection so the inbox row's placeholder is tappable end-to-end (still 404 on `!recipient`). Send still 404s on inactive recipients per spec.
- [x] Tests: deactivated peer still appears in inbox with placeholder; messages still readable. Five new repo specs assert the CASE clause on each substitution site; use-case spec swaps "rejects on inactive" for "returns history on inactive".

##### DM-TASK-H · DTO naming standardization (breaking, cross-repo)
**Touches:** `@localloop/shared-types` `DirectMessage`, API DTOs, mobile types. **Closes:** Gap 12.

- [x] Rename `DirectMessageRow.senderAvatar` → `senderAvatarUrl` in API. Extended to the group `Message` types (`MessageRow`, send/history DTOs + mappers, `message.typeorm.repository.ts`) for chat-surface symmetry.
- [x] Update `@localloop/shared-types` `DirectMessage.senderAvatarUrl` — **major bump to 2.0.0** (mobile actively consumes the field via `PeerBubble`).
- [x] Coordinate with mobile branch consuming the same shape (in-flight `feat/dm-chat-entrypoints` + `feat/dm-mobile-requests` rebase after this lands).
- [x] Land all three repos in lockstep on the `feat/dm-task-h-avatar-rename` slug.

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

- [x] **API:** `GET /users/me/dm-exception-candidates` — shipped on `feat/dm-exception-candidates-api` (2026-05-21). `IDirectMessageRepository.listExceptionCandidates` + `parseStringIdCursor` utility. See top entry in "Last updated".

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
