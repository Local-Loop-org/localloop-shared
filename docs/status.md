# Project Status

> Keep this file updated at the end of every session.
> This is the first file any agent reads to understand where the project is.

---

## Current phase

**Discovery-tap auto-join shipped (mobile-only) on `refactor/decouple-discovery-from-location`.** Tapping a discovery card no longer dumps non-members into a chat that 403s them at three independent membership gates. New behavior: `HomeScreen.handleDiscoveryPress` branches on `group.privacy` — **OPEN** fires `useJoinGroup` (no await) and navigates immediately to `GroupChat`, which gates its history fetch + WS connect on `useIsMutating({ mutationKey: ['join-group'], predicate })` so the chat shows its existing loading skeleton until the join settles; **APPROVAL_REQUIRED** shows a "Solicitar entrada?" confirm modal, sends the request, keeps the user on Home. Same branch also: drops the redundant `userApi.updateLocation` call from `useNearbyGroups` (write was nobody-reads — see grep below); fixes `HomeScreen.handleRefresh` to refetch both `useNearbyGroups` AND `useMyGroups` in parallel (was only refetching nearby); extracts the join mutation from `GroupDetailScreen` into `useJoinGroup` (`useMutation` with optimistic prepend to `MY_GROUPS_KEY` cache on `joined`, no-op on `pending`). 184/184 mobile tests green; typecheck clean. The next-tier UX (badges showing "JÁ FAZ PARTE" / "SOLICITADO" on cards, short-circuiting the join call when already a member or pending) needs `myRole` + `hasPendingRequest` on `NearbyGroup` and is captured as **HOME-9**.

## Last updated

2026-05-08 — `refactor/decouple-discovery-from-location` (mobile-only). New `useJoinGroup` hook owns `groupsApi.joinGroup` + the optimistic `MY_GROUPS_KEY` cache write; carries a stable `mutationKey: ['join-group']` so `useGroupChat` can `useIsMutating({ predicate })` and gate its history `useInfiniteQuery` (`enabled: !!accessToken && !isJoining`) plus the WS effect (early return on `isJoining`); the screen `loading` prop ORs in `isJoining` so the existing skeleton renders during the join. `HomeScreen.handleDiscoveryPress` replaces the old `myRole: null` navigate-to-chat path: OPEN cards fire-and-forget the mutation and navigate immediately with `myRole: MemberRole.MEMBER` (covers the 409 ALREADY_MEMBER case silently); APPROVAL_REQUIRED shows a Cancelar/Solicitar confirm modal and stays on Home. `handleRefresh` now `Promise.all([query.refetch(), myGroupsQuery.refetch()])`. `useNearbyGroups` no longer calls `userApi.updateLocation` (verified: `users.geohash` is written but never read on the API side; only remaining writer is `OnboardingScreen`). Plan captured in `~/.claude/plans/there-is-another-problem-wise-bird.md`.

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
- [x] Backend: TypeORM `entities` and `migrations` consolidated into single registry files at `src/infra/typeorm/{entities,migrations}.ts`. Both `data-source.ts` (CLI) and `app.module.ts` (boot, `migrationsRun: true`) import from the same source — the two arrays can no longer drift. Triggered by a prod incident on 2026-05-01 where the HOME-6 migration was registered only in `data-source.ts` and never ran on Render.
- [x] HOME-6 — Real distance on discover cards (all three repos, `feat/home-6-distance-meters`). Shared: `@localloop/geo-utils@1.2.0` adds haversine `distanceMeters(lat1, lng1, lat2, lng2)`; `@localloop/shared-types@1.1.0` adds the `NearbyGroup` interface (single source of truth for API + mobile). API: migration `1714500000000-AddGroupAnchorCoordinates` adds `anchor_lat` / `anchor_lng NUMERIC(9,6) NOT NULL` to `groups` and backfills existing rows from geohash centers via `ngeohash.decode`; ORM entity gets a numeric→number transformer (pg returns NUMERIC as string); `CreateGroupUseCase` persists lat/lng alongside the derived geohash; `DiscoverNearbyGroupsUseCase` returns `distanceMeters` instead of `proximityLabel`; `NearbyGroupDto` aliased to the shared interface; 9 spec fixtures updated for the new `Group` constructor args. Mobile: `groups.api.ts` re-exports `NearbyGroup` from shared-types and drops the inline `ProximityLabel` union; new `src/shared/format/distance.ts` formatter (`<1000m` → nearest-10 `M`, `<10km` → one-decimal pt-BR `Km`, `≥10km` → integer `Km`) with 4 tests; `DiscoverCard`/`DiscoverRow` render `formatDistance(group.distanceMeters)`; 3 test fixtures swapped. 132/132 mobile + 112/112 API tests green, typechecks clean.
- [x] Phase 3 Chat redesign — Slice B (all three repos, `feat/chat-redesign-slice-b`). Adds live online count to the chat header subtitle. Shared: `@localloop/shared-types@1.2.0` exports `PresenceUpdate { groupId, count }`; `docs/api-contracts.md` drops the `[PLANNED]` tag from the `/chat` WebSocket section and documents the new `presence_update` server→client event. API: `ChatGateway` adds `emitPresence(groupId)` reading room size via `server.in(room).fetchSockets()` (multi-instance-correct through the Redis adapter), called after every successful join, every leave, and from a `disconnecting` listener wrapped in `setImmediate` so Socket.IO's room cleanup runs before the count is read; 5 new gateway specs (117/117 green). Mobile: `useGroupChat` adds `onlineCount` state, listens for `presence_update` filtered to the active `groupId`, resets to 0 on unmount; `GroupChatLayout` restructures `headerCenter` to stack the title row and a new mono-font `headerSubtitle` (`colors.faint`, letter-spaced) rendered only when `onlineCount > 0` as `· N ONLINE ·`; 4 new tests (136/136 green, typechecks clean). v1 caveat: same user on multiple devices counts multiple times (documented in api-contracts.md). Unblocks HOME-5.

---

## In progress

**`refactor/decouple-discovery-from-location` (mobile-only) — ready for PR.** Discovery-tap UX fix: HomeScreen privacy branch + `useJoinGroup` mutation + `useGroupChat` gating on in-flight joins. Also bundles two adjacent cleanups: drop the redundant `users.geohash` write from `useNearbyGroups`, and refetch `useMyGroups` alongside `useNearbyGroups` on pull-to-refresh. 184/184 mobile tests green. Pick next from "Up next" after merge: HOME-9 (membership status on `NearbyGroup` — unblocked once this lands), HOME-5 (live presence on home cards), HOME-8 (search), Phase 3 Slice 2 (media upload), Phase 2 Redis cache, Phase 2 API integration tests, Maestro E2E, or remaining RQ migration backlog (TD-09).

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
- [x] Phase 2 mobile — `useCurrentLocation` (4), `groups.api` (9), `CreateGroupScreen` (6), `GroupDiscoveryScreen` (7), `GroupMembersScreen` (9), `GroupDetailScreen` (17)

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
- [ ] **HOME-5** Mobile: live presence on home cards (depends on Chat redesign Slice B presence pipeline). Adds green dot + live count badge + "ATIVO AGORA" subtitle.
- [x] **HOME-6** API + mobile: distance string ("210M") on `NearbyGroup` (API returns meters; mobile formats `<n>M` / `<n>Km`). Replaces `proximityLabel` on cards. — _Done (`feat/home-6-distance-meters`)._
- [x] **HOME-7** Mobile: "Ver todos →" detail screens — one per section (`GroupListByTypeScreen`) showing all groups of a single anchor type with infinite scroll. Also: add a "Ver todos" entry for "Meus grupos" using `useMyGroups(limit=50)` or `useInfiniteQuery`. Reuse or extract `MyGroupRow` from `HomeScreen/layout/MyGroupRow.tsx` — it has the right shape but may need additions (unread badge, swipe-to-leave) before extracting to a shared folder.
- [ ] **HOME-8** Mobile: search action in header (icon present today, no-op) → group-search screen.
- [ ] **HOME-9** API + mobile: membership status on `NearbyGroup`. API: pass `userId` into `IGroupRepository.findNearby`; LEFT JOIN against `group_members` and `group_join_requests` to expose `myRole: MemberRole | null` and `hasPendingRequest: boolean` on `NearbyGroupDto`. Shared: extend `NearbyGroup` interface (`@localloop/shared-types` minor bump). Mobile: render status badge on `DiscoverCard` / `DiscoverRow` ("JÁ FAZ PARTE" / "SOLICITADO" / nothing); short-circuit `handleDiscoveryPress` so already-members navigate directly with their real `myRole` and skip `joinGroup`, and pending-requesters get a "Solicitação já enviada" alert without re-firing the mutation.

### Phase 4 — DMs + Push Notifications

- [ ] Resolve DP-02 (push notification provider)
- [ ] Migration: `direct_messages` table
- [ ] DMModule: `SendDirectMessageUseCase` (enforces `dm_permission` rules)
- [ ] Push notification service
- [ ] Mobile: DM screen, push notification handling
- [ ] Maestro E2E: DM flow with each `dm_permission` level

### Phase 5 — Polish

- [ ] Moderation: soft-delete messages, ban flow
- [ ] Rate limiting (NestJS ThrottlerModule)
- [ ] LGPD: `DELETE /users/me` (account deletion, data erasure)
- [ ] Full E2E suite on CI (Maestro Cloud or local)
- [ ] Load testing on WebSocket gateway

### RQ migration backlog (TD-09)

Pilot landed in Phase 3 Slice 1 (`useGroupChat`: `useInfiniteQuery` for history + optimistic `sendMessage`). Remaining migrations, each in its own `refactor/rq-<slug>` branch:

**HTTP cache — convert `useState + useEffect` fetch calls to `useQuery`**

- [x] `GroupDiscoveryScreen` → `useQuery(['groups', 'nearby', "lat,lng"], ...)` — landed as `useNearbyGroups` in the Home redesign (the screen itself was renamed to `HomeScreen`)
- [ ] `GroupDetailScreen` → `useQuery(['groups', 'detail', groupId], ...)`
- [ ] `GroupMembersScreen` → `useInfiniteQuery(['groups', 'members', groupId], ...)`
- [ ] `GroupDetailScreen` pending requests → `useQuery(['groups', 'requests', groupId], ...)` (replaces `useFocusEffect` manual refetch)
- [ ] `GET /users/me` (currently only called inside auth flow) — wrap when a user-profile screen exists

**Optimistic mutations — convert to `useMutation` with `onMutate` / rollback**

- [ ] `joinGroup` — optimistic `myRole` flip (OPEN → member, APPROVAL_REQUIRED → local pending state)
- [ ] `leaveGroup` — optimistic removal + navigate on success
- [ ] `banMember` — optimistic removal from members list (already done manually — port to mutation)
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
| DP-02 | Push notification provider (Expo Push vs Firebase FCM) | Phase 4 |

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
| TD-08 | `UpdateUserLocationUseCase` has no <300m no-op — every location update writes a new geohash even for tiny movements | User module | Low |
| TD-09 | Mobile REST endpoints use ad-hoc `useState + useEffect` in every screen — no cache, no dedup, no optimistic updates. Decision: migrate to `@tanstack/react-query`. Phase 3 Slice 1 piloted it in `useGroupChat`; Home redesign expanded with `useNearbyGroups` (`HomeScreen`). Remaining surfaces (GroupDetailScreen, GroupMembersScreen, CreateGroupScreen, the join/leave/ban/resolve mutations) listed under "RQ migration backlog" in Up next. | Phase 2 mobile | Medium |
| ~~TD-10~~ | ~~Auth response under-specifies the User shape~~ — **Fixed (`feat/td-10-auth-user-shape`)**: `@localloop/shared-types@1.3.0` exports `UserSummary`; backend `UserSummaryDto` and `UserProfileDto` both `implements UserSummary` (auth response now carries `dmPermission` + `createdAt`); mobile `User` interface re-exports `UserSummary` (drops the 4 dead fields `providerId`/`geohash`/`isActive`/`lastSeenAt`) and `auth.api.ts:mapToAuthResponse` is a direct pass-through. | Auth flow | ~~Medium~~ |

---

## Known issues

| ID | Description | Severity | Discovered |
|----|-------------|----------|-----------|
| ~~BUG-01~~ | ~~`docker-compose.yml` has no Redis service~~ — **Fixed**: Redis 7 Alpine service added alongside PostGIS | ~~Medium~~ | 2026-04-15 |
