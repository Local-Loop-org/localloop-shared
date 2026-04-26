# Project Status

> Keep this file updated at the end of every session.
> This is the first file any agent reads to understand where the project is.

---

## Current phase

**Home redesign — Slice 1 — implementation complete on `feat/home-redesign`, awaiting commit/merge.** Mobile-only: `GroupDiscoveryScreen` replaced by `HomeScreen`, a sectioned home surface that buckets nearby groups by `anchorType` into Lugares (Estabelecimento) → Bairros (Neighborhood) → Prédios (Condo) → Eventos (Event). Establishments + events render as horizontal cards; neighborhoods + condos as vertical rows; empty buckets hidden; CITY excluded. Header is `LocalLoop` title + (no-op) search + `more` action sheet (one item: Sair). Bottom tab bar is presentational only — Início/Inbox/+/Mapa/Perfil — with `+` wired to `CreateGroup`. `useNearbyGroups` (TD-09 expansion) now drives the data fetch via React Query. Route renamed `GroupDiscovery` → `Home` and old screen folder deleted. 121/121 tests green, typecheck clean. Slice 1 ships without "Meus grupos", real bottom-tabs, distance, presence, search, location chip — all tracked as HOME-2..HOME-9 below. Next candidate work: HOME-2 (`GET /groups/me`) → HOME-3 ("Meus grupos" wiring), Chat redesign Slice B (presence + per-message proximity), Phase 3 Slice 2 (media upload), or remaining RQ backlog.

## Last updated

2026-04-26 — Home redesign Slice 1 implemented on `feat/home-redesign` (mobile-only). New `HomeScreen` + layout subtree (`HomeHeader`, `SectionLabel`, `DiscoverCard`, `DiscoverRow`, `DiscoverDivider`, `BottomTabBar`); new `useNearbyGroups` hook (key `['groups','nearby', "lat,lng"]`, 30s `staleTime`, gates on coords, calls `userApi.updateLocation` before `groupsApi.getNearbyGroups`); new shared `@/shared/anchor/labels` util holding `ANCHOR_TYPE_LABELS` + `ANCHOR_SECTION_LABELS` (CreateGroupScreen migrated to use it). Route key `GroupDiscovery` → `Home`; `AuthenticatedStack` and `types.ts` updated. Old `GroupDiscoveryScreen/` folder deleted (its 7 tests are subsumed by 8 new HomeScreen tests). Plan captured in `~/.claude/plans/phase-3-slice-1-effervescent-chipmunk.md`.

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
- [x] Phase 3 Slice 1 — Text chat. API: `messages` migration, `MessagesModule` (domain entity + repo, `SendMessage` + `GetMessageHistory` use cases with specs, TypeORM mapper/repo, `GET /groups/:id/messages` history endpoint, Socket.IO `/chat` gateway with `join_group` / `leave_group` / `send_message`, Redis pub-sub adapter with in-memory fallback, namespace middleware auth). Mobile: `messages.api`, `chat-socket`, `useGroupChat` (React Query `useInfiniteQuery` history + optimistic `sendMessage` — TD-09 pilot), `GroupChatScreen` + nav wiring + GroupDetail entry button. Unit test coverage on all new use cases, the gateway, the hook, and the screen.
- [x] Home redesign — Slice 1 (mobile-only, `feat/home-redesign`). `GroupDiscoveryScreen` replaced by `HomeScreen` with sectioned layout (Lugares / Bairros / Prédios / Eventos via `anchorType`); horizontal cards for establishments + events, vertical rows for neighborhoods + condos; empty buckets hidden; CITY excluded; `LocalLoop` header + `more` action sheet (Sair only); presentational bottom tab bar (Início/Inbox/+/Mapa/Perfil) with `+` → `CreateGroup`. New `useNearbyGroups` React Query hook (key `['groups','nearby', "lat,lng"]`, 30s `staleTime`, calls `userApi.updateLocation` before `groupsApi.getNearbyGroups`). New shared util `@/shared/anchor/labels` (`ANCHOR_TYPE_LABELS` + `ANCHOR_SECTION_LABELS`); CreateGroupScreen migrated. Route renamed `GroupDiscovery` → `Home`; old screen folder deleted. 121/121 tests green, typecheck clean. "Meus grupos" pinned section, real bottom-tabs navigator, distance string, presence, search, and location chip all deferred to HOME-2..HOME-9.
- [x] Phase 3 Chat redesign — Slice A (mobile-only, `feat/chat-redesign-slice-a`). New `GroupChatScreen` layout: custom header (back / anchor-type icon + tappable group name + chevron / members), pt-BR day separators (HOJE/ONTEM/DD/MM via `date-fns`), peer bubbles (dark surface + line border + asymmetric `borderBottomLeftRadius`), own bubbles (cyan→lavender `LinearGradient` + asymmetric `borderBottomRightRadius`), mono-font timestamps, redesigned composer (inert `+` button, pill `TextInput`, gradient send button). Nav rewire: Discovery → Chat directly (Detail/Members reachable via the chat header). Shared icon system at `src/shared/icons/` — `<Icon name=… size=… color=… strokeWidth=…/>` built on `react-native-svg` covering 30 glyphs + `anchorIconName(AnchorType)` mapping; replaces `@expo/vector-icons`. Theme: added `colors.line/dim/faint` and `colors.accent2` (soft lavender for the gradient pair). Route params: `GroupChat` extended with `anchorType: AnchorType`; both call sites updated. Tests: 114/114 green, typecheck clean. Slice B (proximity badges + presence subtitle) intentionally deferred — needs gateway/geohash work.

---

## In progress

**Home redesign Slice 1** — implementation complete on `feat/home-redesign` (mobile-only). Awaiting user approval to commit + merge. Chat redesign Slice A is also complete on `feat/chat-redesign-slice-a` and still awaiting commit/merge. Next pick from "Up next": HOME-2 (`GET /groups/me` backend) → HOME-3 ("Meus grupos" wiring), Chat redesign Slice B (proximity + presence), Phase 3 Slice 2 (media upload + picker), Phase 2 API integration tests, Maestro E2E (Phase 1/2 flows), or remaining RQ migration backlog (TD-09).

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

*Slice A — frontend-only* ✅
- [x] Custom header on `GroupChatScreen`: back button, anchor-type icon + group name + chevron (tap → `GroupDetailScreen`), members icon (tap → `GroupMembersScreen`)
- [x] Day separators in the message list (`· HOJE ·`, `· ONTEM ·`, `· DD/MM ·` via `date-fns` + pt-BR locale)
- [x] Bubble redesign: peer messages dark surface + line border + name above; own messages cyan→lavender gradient with asymmetric corners
- [x] Input bar redesign: `+` action button (inert until Slice 2 media), pill input, gradient send button
- [x] Nav flow change: `GroupDiscoveryScreen` opens `GroupChatScreen` directly; detail/members reachable only from the chat header
- [x] Hide proximity tag and online count in the header until Slice B lands — header rendered without them rather than stubbed
- [x] Shared icon system at `src/shared/icons/` (custom `<Icon>` on `react-native-svg`, typed `IconName` union, `anchorIconName(AnchorType)` helper); replaces `@expo/vector-icons`

*Slice B — backend-touching pieces*
- [ ] Per-message proximity label (`AQUI`, `120M`, etc.): extend message DTO with sender-relative-to-viewer proximity, computed at history fetch and at `new_message` broadcast time using each user's current geohash
- [ ] Online count + presence: gateway tracks `group:{groupId}` room size and emits `presence_update` events on join/leave; subtitle shows `· N ONLINE · <proximity-label> ·`

### Home redesign — follow-ups

Slice 1 (`HomeScreen` + sectioned discovery + presentational bottom tabs) is implemented on `feat/home-redesign`. Items below extend it incrementally without re-laying-out the screen.

- [ ] **HOME-2** API: `GET /groups/me` (paginated; returns `id`, `name`, `anchorType`, `anchorLabel`, `memberCount`, `myRole`; include `lastMessage` summary + `unreadCount` + `lastReadAt` if scope allows). Unblocks the "Meus grupos" pinned section.
- [ ] **HOME-3** Mobile: render the "Meus grupos" pinned section once HOME-2 ships. `MyGroupRow` component is intentionally **not** in place yet (deferred to this ticket); wire `useMyGroups` (React Query) + render above the discovery sections.
- [ ] **HOME-4** Mobile: real `@react-navigation/bottom-tabs` navigator wrapping the home stack. Stub `InboxScreen`, `MapScreen`, `ProfileScreen` (each a centered "em breve" panel). Move logout from the header `more` action sheet to `ProfileScreen`.
- [ ] **HOME-5** Mobile: live presence on home cards (depends on Chat redesign Slice B presence pipeline). Adds green dot + live count badge + "ATIVO AGORA" subtitle.
- [ ] **HOME-6** API + mobile: distance string ("210M") on `NearbyGroup` (API returns meters; mobile formats `<n>M` / `<n>KM`). Replaces `proximityLabel` on cards.
- [ ] **HOME-7** Mobile: "Ver todos →" detail screens — one per section (`GroupListByTypeScreen`) showing all groups of a single anchor type with infinite scroll.
- [ ] **HOME-8** Mobile: search action in header (icon present today, no-op) → group-search screen.
- [ ] **HOME-9** Mobile: location chip "◎ BAIRRO · CIDADE" in the header — depends on a reverse-geocoding source not yet wired.

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
| TD-09 | Mobile REST endpoints use ad-hoc `useState + useEffect` in every screen — no cache, no dedup, no optimistic updates. Decision: migrate to `@tanstack/react-query`. Phase 3 Slice 1 piloted it in `useGroupChat`; Home redesign expanded with `useNearbyGroups` (`HomeScreen`). Remaining surfaces (GroupDetailScreen, GroupMembersScreen, CreateGroupScreen, the join/leave/ban/resolve mutations) listed under "RQ migration backlog" in Up next. | Phase 2 mobile | Medium |

---

## Known issues

| ID | Description | Severity | Discovered |
|----|-------------|----------|-----------|
| ~~BUG-01~~ | ~~`docker-compose.yml` has no Redis service~~ — **Fixed**: Redis 7 Alpine service added alongside PostGIS | ~~Medium~~ | 2026-04-15 |
