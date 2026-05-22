# Testing backlog

> All pending testing work, consolidated here so `status.md` doesn't carry
> it across every phase. Closed unit suites for shipped features live in
> [`done.md`](./done.md); add new tests here as they're proposed.

---

## API — integration tests (Jest + Supertest + test DB)

### Auth + users

- [ ] `POST /auth/google` — valid token, invalid token
- [ ] `POST /auth/apple` — valid token, invalid token
- [ ] `POST /auth/refresh` — valid, expired, invalid
- [ ] `GET /users/me` — authenticated, unauthenticated
- [ ] `PATCH /users/me` — valid update, invalid fields
- [ ] `PATCH /users/me/location` — valid coords, verifies geohash stored (not coords)

### Phase 2 — Groups

- [ ] Integration tests (Supertest + test DB) for Phase 2 endpoints (create / discover / detail / join / leave / approve-reject / ban / unban / list members / list banned / promote / demote)

### Phase 3 — Chat

- [ ] WebSocket integration tests (full ack/broadcast path against a running app + Redis)

---

## E2E — Maestro

### Auth flows

- [ ] Flow 1 — Google login → new user → onboarding → home
- [ ] Flow 2 — App restart → session restored → goes directly to home
- [ ] Flow 3 — Logout → goes to login screen

### Phase 2 — Groups

- [ ] Discover groups
- [ ] Join open group
- [ ] Join approval-required group
- [ ] Leave group

### Phase 3 — Chat (Slice 2)

- [ ] Send text message
- [ ] Send image
- [ ] Receive message in real-time

### Phase 4 — DMs (M5 — blocked on M3 for the push-tap flow)

- [ ] Send a DM (one flow per `dm_permission` value)
- [ ] Receive a DM in real time
- [ ] Approve a DM request
- [ ] Tap a DM push notification → `DmChatScreen` opens with the right thread

### Phase 5 — Polish

- [ ] Full E2E suite on CI (Maestro Cloud or local) — runs every flow above.
