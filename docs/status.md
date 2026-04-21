# Project Status

> Keep this file updated at the end of every session.
> This is the first file any agent reads to understand where the project is.

---

## Current phase

**Phase 1 — Foundation** (cleanup + completing remaining items)

## Last updated

2026-04-21 — UserModule implemented + geo-utils 1.1.0 published + global ValidationPipe added.

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

---

## In progress

**Current task:** Phase 1 mobile wiring — connect onboarding to backend

**Started:** 2026-04-15
**Next step:** Wire OnboardingScreen to call PATCH /users/me (display name) and PATCH /users/me/location (coordinates)

---

## Up next

### Phase 1 — Complete Foundation

**1. Cleanup** ✅
- [x] Move Supabase URL + anon key to env vars (`EXPO_PUBLIC_*`)
- [x] Unify HTTP layer: `auth.api.ts` migrated to shared `apiClient` (axios, env-based URL)
- [x] 401 interceptor on `apiClient` — refresh + retry queue + test coverage

**2. Backend — missing Phase 1 endpoints**
- [x] `RefreshTokenUseCase` + `POST /auth/refresh`
- [x] UserModule: `GET /users/me`, `PATCH /users/me` (display name, dm_permission)
- [x] `PATCH /users/me/location` (coordinate → geohash via geo-utils)
- [x] `packages/geo-utils`: coordinate→geohash, 8 neighbor cells, proximity label generation (v1.1.0)

**3. Mobile — missing Phase 1 wiring**
- [ ] OnboardingScreen: call `PATCH /users/me` to persist display name to backend
- [ ] OnboardingScreen: call `PATCH /users/me/location` after granting permission
- [x] Update `apiClient` base URL from hardcoded to env var

**4. Infrastructure**
- [ ] Add Redis service to `docker-compose.yml`
- [x] Fix `JwtStrategy` fallback secret (TD-01) — throw error if `JWT_SECRET` not set

### Testing (parallel track — build as you implement)

**API — unit tests (Jest)**
- [ ] `ExchangeGoogleTokenUseCase` — mock IUserRepository + SupabaseService + JwtService
- [ ] `ExchangeAppleTokenUseCase` — same pattern
- [x] `RefreshTokenUseCase` — 5 tests: valid, expired, invalid, user not found, user inactive
- [ ] `UpdateUserProfileUseCase` — field validation
- [ ] `UpdateUserLocationUseCase` — coordinate→geohash conversion, no-op if <300m

**API — integration tests (Jest + Supertest + test DB)**
- [ ] `POST /auth/google` — valid token, invalid token
- [ ] `POST /auth/apple` — valid token, invalid token
- [ ] `POST /auth/refresh` — valid, expired, invalid
- [ ] `GET /users/me` — authenticated, unauthenticated
- [ ] `PATCH /users/me` — valid update, invalid fields
- [ ] `PATCH /users/me/location` — valid coords, verifies geohash stored (not coords)

**Mobile — unit tests (Jest + React Native Testing Library)**
- [ ] `useAuthStore`: setAuth persists to SecureStore, logout clears all, initialize restores state
- [ ] `LoginScreen`: renders buttons, shows loader on press, calls setAuth on success, shows error alert on failure
- [ ] `RootNavigator`: routes to AuthStack / Onboarding / Home based on state
- [ ] `OnboardingScreen`: validates name length, blocks finish without location, calls APIs on finish

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

### Phase 2 — Groups (starts after Phase 1 complete)

- [ ] Migration: `groups`, `group_members`, `group_join_requests` tables
- [ ] GroupsModule: `CreateGroupUseCase`, `DiscoverNearbyGroupsUseCase`, `JoinGroupUseCase`, `LeaveGroupUseCase`
- [ ] Moderation: `ApproveJoinRequestUseCase`, `BanMemberUseCase`
- [ ] Mobile: GroupDiscovery screen, GroupDetail screen, CreateGroup screen
- [ ] Redis cache for nearby groups (TTL = 5min per geohash cell)
- [ ] Unit + integration tests for all use cases
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
| TD-05 | Onboarding display name never persisted to backend — only clears `isNewUser` in local state | Onboarding | High |
| ~~TD-06~~ | ~~No 401 interceptor on `apiClient`~~ — **Fixed**: interceptor with refresh + retry queue + tests | Auth flow | ~~High~~ |
| TD-07 | No unit tests exist for any use case | All modules | Medium |

---

## Known issues

| ID | Description | Severity | Discovered |
|----|-------------|----------|-----------|
| BUG-01 | `docker-compose.yml` has no Redis service — Phase 2 and Phase 3 will fail at startup | Medium | 2026-04-15 |
