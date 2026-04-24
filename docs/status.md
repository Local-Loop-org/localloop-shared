# Project Status

> Keep this file updated at the end of every session.
> This is the first file any agent reads to understand where the project is.

---

## Current phase

**Phase 3 Slice 1 — Text chat.** Backend (messages migration + MessagesModule + ChatGateway + Redis adapter) and mobile (messages.api + chat-socket + useGroupChat + GroupChatScreen + nav wiring) complete and unit-tested. Refactoring `useGroupChat` to use React Query (`useInfiniteQuery` for history + optimistic `sendMessage`) before commit — pilots TD-09 adoption.

## Last updated

2026-04-24 — Phase 3 Slice 1 implementation landed behind the refactor; React Query adopted as the HTTP cache layer (TD-09); RQ migration backlog added below.

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
- [x] Jest path alias (@/*) configured — unblocks all future unit tests
- [x] CI: localloop-api — lint + unit tests + integration tests + Docker image build
- [x] CI: localloop-mobile — lint + type-check + unit tests + EAS Build Android (iOS deferred)
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

---

## In progress

**Current task:** Phase 3 Slice 1 — React Query refactor of `useGroupChat` (history via `useInfiniteQuery`, optimistic `sendMessage`). Pilots TD-09.

**Started:** 2026-04-24
**Next step:** Install `@tanstack/react-query` in mobile, wire `QueryClientProvider` at app root, convert `useGroupChat`, update `useGroupChat.test.ts` + `GroupChatScreen.test.tsx`. After this slice: Phase 2 integration tests, Maestro E2E, and the RQ migration backlog (see "Up next").

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
- [x] Workflow: `lint → type-check → unit tests → EAS Build (Android only)`
- [x] Trigger: push to `main`, PRs targeting `main`
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
- [ ] Redis cache for `GET /groups/nearby` (TTL = 5min per geohash cell) — blocked on DP-01
- [x] Unit tests for all Phase 2 use cases, mobile screens, hook, api module
- [ ] Integration tests (Supertest + test DB) for Phase 2 endpoints
- [ ] Maestro E2E: discover groups, join open group, join approval group, leave group

### Phase 3 — Chat

- [ ] Migration: `messages` table
- [ ] MessagesModule: `GetMessageHistoryUseCase`, `SendMessageUseCase`
- [ ] WebSocket gateway (Socket.IO) + Redis adapter for pub-sub
- [ ] Media upload: presigned URL endpoint + Supabase Storage integration
- [ ] Mobile: ChatScreen (real-time), media picker
- [ ] Unit + integration tests; WebSocket integration tests
- [ ] Maestro E2E: send text message, send image, receive message in real-time

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

Pilot lands in Phase 3 Slice 1 (`useGroupChat`: `useInfiniteQuery` for history + optimistic `sendMessage`). Remaining migrations, each in its own `refactor/rq-<slug>` branch:

**HTTP cache — convert `useState + useEffect` fetch calls to `useQuery`**
- [ ] `GroupDiscoveryScreen` → `useQuery(['groups', 'nearby', geohash], ...)`
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
| DP-01 | Redis hosting for production (self-hosted vs Upstash) | Phase 2 cache, Phase 3 WebSocket pub-sub |
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
| TD-09 | Mobile REST endpoints use ad-hoc `useState + useEffect` in every screen — no cache, no dedup, no optimistic updates. Decision: migrate to `@tanstack/react-query`. Phase 3 Slice 1 pilots it in `useGroupChat` (history + optimistic `sendMessage`); remaining surfaces to migrate listed under "RQ migration backlog" in Up next. | Phase 2 mobile | Medium |

---

## Known issues

| ID | Description | Severity | Discovered |
|----|-------------|----------|-----------|
| ~~BUG-01~~ | ~~`docker-compose.yml` has no Redis service~~ — **Fixed**: Redis 7 Alpine service added alongside PostGIS | ~~Medium~~ | 2026-04-15 |
