# Architecture — LocalLoop

> This document describes structural decisions that apply to the entire codebase.
> For individual decisions with full context, see docs/decisions/.

---

## Stack

| Layer | Technology | Version | Decision record |
|-------|-----------|---------|----------------|
| API framework | NestJS | 10.x | ADR-001 |
| ORM | TypeORM | 0.3.x | ADR-001 |
| Database | PostgreSQL + PostGIS | 17 + 3.5 | ADR-002 |
| Mobile | Expo (React Native) | SDK 55 | ADR-003 |
| Auth provider | Supabase Auth | 2.x | ADR-004 |
| Storage | Supabase Storage | 2.x | ADR-004 |
| Cache / Pub-Sub | Redis | 7.x | — |
| Real-time | Socket.IO + Redis Adapter | 4.x | — |
| Push notifications | Expo Push first, provider port for future FCM | — | — |
| Location encoding | ngeohash | 0.6.x | ADR-005 |
| Shared packages toolchain | npm publish (`@localloop/*`) | — | — |

---

## Architectural pattern

**Clean Architecture** — dependencies always point inward.

```
presentation  →  application  →  domain
infrastructure  →  application  →  domain
```

- **domain** — pure entities and repository interfaces. No framework imports.
- **application** — use cases (one class = one use case). Depends only on domain.
- **infra** — TypeORM mappers, repository implementations, external service adapters (Supabase, Redis). Implements domain interfaces.
- **presentation** — NestJS controllers, DTOs, WebSocket gateways. Calls use cases only.

**Dependency rule:** domain and application layers must never import from infra or presentation.

---

## Module structure

Each feature is a self-contained NestJS module following the same internal layout:

```
src/
  modules/
    auth/
      domain/
        entities/          ← pure domain entities (no TypeORM decorators)
        repositories/      ← interfaces (IUserRepository, etc.)
      application/
        use-cases/
          <use-case-name>/
            <name>.use-case.ts
            <name>.dto.ts
      infra/
        mappers/           ← entity ↔ ORM model conversions
        repositories/      ← TypeORM implementations of domain interfaces
        strategies/        ← Passport strategies
      presentation/
        <resource>.controller.ts
        gateways/          ← Socket.IO gateways (for chat module)
      <module-name>.module.ts
  shared/
    supabase/              ← SupabaseService (auth verification + storage)
  infra/
    typeorm/
      data-source.ts       ← TypeORM DataSource config
    migrations/            ← numbered TypeORM migrations
```

---

## Mobile screen structure

Each screen in `src/presentation/screens/` (localloop-mobile repo) is a self-contained folder:

```
screens/
  <ScreenName>/
    index.tsx        ← container: hooks, store selectors, event handlers, renders <Layout>
    types.ts         ← screen-level types (store selectors, use-case result types)
    layout/
      index.tsx      ← pure presentational component — receives all data/callbacks as props
      styles.ts      ← StyleSheet.create({...}) — no store or hook imports
      types.ts       ← LayoutProps interface
```

**Rules:**
- `layout/index.tsx` must be a pure presentational component: it accepts props, renders JSX, and has no side effects.
- All state (`useState`), store reads (`useAuthStore`), and async handlers live exclusively in `<Screen>/index.tsx`.
- `layout/styles.ts` imports only from `@/shared/theme` and React Native — never from stores or hooks.
- Navigation imports (`import LoginScreen from '../screens/LoginScreen'`) resolve to `LoginScreen/index.tsx` automatically — no explicit `/index` suffix needed.

---

## State management

Mobile-only. The app has two distinct kinds of state; pick the right tool, not both.

| Kind | Tool | Examples |
|------|------|----------|
| **Server state** — anything fetched from the API | `@tanstack/react-query` | group lists, group detail, members, chat history, pending join requests, `/users/me` |
| **Client-only state** — lives on device, no server round-trip | `zustand` | auth session (tokens, current user), form drafts, UI-only toggles |

### Rules

- **Every REST endpoint is consumed through React Query.** Use `useQuery` for reads, `useInfiniteQuery` for cursor-paginated lists, `useMutation` for writes. Never pair `useState + useEffect + axios` for server data — it loses the cache, dedup, and retry behavior React Query gives for free.
- **Mutations that change visible UI state must be optimistic.** Implement `onMutate` (snapshot + update the cache), `onError` (rollback from snapshot), `onSettled` (invalidate or reconcile). Applies to join/leave/ban, role changes, profile edits, message sends.
- **Real-time events write into the same query cache.** Socket.IO handlers call `queryClient.setQueryData` on the same key the HTTP fetch populated — one source of truth, no parallel `useState` lists. Dedup by server id; reconcile optimistic temps by matching `senderId + content` (mobile-only heuristic, since the backend has no `clientId` contract).
- **Query keys are hierarchical tuples**, e.g. `['chat', 'history', groupId]`, `['groups', 'nearby', geohash]`, `['groups', 'detail', groupId]`. Keep the shape consistent so partial invalidations (`['groups']`) work predictably.
- **Do not invalidate on unmount.** Default `gcTime` (5 min) keeps the cache warm so reopening a screen within the window renders instantly. Invalidate only when you know the server state changed (after a mutation, after a push notification).
- **Zustand stays for auth and ephemeral client state.** Tokens, the current user object, and form drafts are not server state — they do not belong in React Query.

The `QueryClient` is instantiated once in `src/infra/react-query/client.ts` and provided at the app root in `App.tsx`.

### Rationale

Before RQ, every screen re-fetched on mount, had no optimistic UI, and duplicated loading/error/retry boilerplate. The chat hook (`useGroupChat`) was the pilot — history via `useInfiniteQuery`, optimistic `sendMessage`, socket events writing into the same cache. TD-09 is closed; new REST server state must continue to use React Query hooks and write realtime effects into the same query cache.

---

## Cross-cutting concerns

### Error handling

- Use cases throw NestJS built-in HTTP exceptions (`UnauthorizedException`, `NotFoundException`, `ForbiddenException`).
- Controllers let exceptions propagate — NestJS global exception filter serializes them.
- Error response format: `{ "error": "ERROR_CODE", "message": "Human readable" }`

### Logging

- Use NestJS built-in `Logger`.
- **Never log:** user coordinates, geohash, tokens, PII.
- Log at `error` level: unexpected exceptions.
- Log at `log` level: use case execution start/end for auth and moderation actions.

### Validation

- All request bodies validated with `class-validator` + `class-transformer` via NestJS global `ValidationPipe`.
- Validation happens in the presentation layer (DTOs); use cases trust their inputs.

### Authentication

- `JwtAuthGuard` (Passport JWT strategy) applied per-route via `@UseGuards`.
- OAuth tokens (Google / Apple) are verified server-side via Supabase Auth before issuing our own JWTs.
- JWT payload: `{ sub: userId, email }`. Access token: 1h. Refresh token: 30d.
- Refresh token use case: **not yet implemented** (see status.md).

### Location privacy

- User `lat/lng` is **never stored** — only `geohash` (precision 6, ~1.2km²).
- `geohash` is **never returned** in any API response.
- Group anchor `lat/lng` is public group metadata. It is stored (`anchor_lat` / `anchor_lng NUMERIC(9,6)`) and may be returned to clients for group detail, map, and user-to-group distance UI.
- User-to-group distance may be computed either server-side or client-side. When computed client-side, keep the user's exact device coordinates local and combine them only with public group anchor coordinates.
- **No user-to-user distance is ever computed or returned.** Distance is only meaningful from a user to a group anchor (a public point). Per-message proximity badges and similar features are explicitly out of scope to prevent triangulation attacks.

### Real-time (chat — Phase 3)

- Socket.IO with `@socket.io/redis-adapter` for multi-instance pub-sub.
- Room naming: `group:{groupId}` and `dm:{userId1}:{userId2}` (sorted IDs).
- Public realtime contract remains one namespace, `/chat`. Do not split DMs
  into a second namespace unless a new ADR explicitly changes the contract.
- Backend ownership after TD-13:

```text
MessagesModule          -> AuthModule, GroupsModule, TypeOrmModule
DirectMessagesModule    -> AuthModule, GroupsModule, RealtimeEventsModule, TypeOrmModule
RealtimeModule          -> AuthModule, GroupsModule, NotificationsModule,
                           MessagesModule, DirectMessagesModule,
                           RealtimeEventsModule
RealtimeEventsModule    -> no feature modules
```

- `RealtimeModule` owns `ChatGateway` and Socket.IO `/chat` wiring.
  `ChatGateway` should stay thin: socket auth, `@SubscribeMessage` methods,
  minimal payload validation, connection lifecycle hooks, and delegation.
- Realtime behavior lives in focused presentation services:
  `GroupPresenceRealtimeService`, `GroupSummaryRealtimeService`,
  `GroupMessageRealtimeService`, `DmPresenceRealtimeService`,
  `DmInboxRealtimeService`, and `DmMessageRealtimeService`.
- HTTP controllers must not inject `ChatGateway`. When a REST mutation needs
  realtime fan-out, emit a typed in-process event through
  `RealtimeEventsService`; `RealtimeModule` subscribes and routes the effect.
  Current event types are `dm_request_accepted`, `dm_summary_requested`, and
  `dm_read`.
- `MessagesModule` and `DirectMessagesModule` must not import each other or use
  `forwardRef` for realtime wiring. If a future feature reintroduces that edge,
  route the side effect through `RealtimeEventsModule` or a dedicated port.

### Direct messages (Phase 4)

DMs have a two-track delivery model. A send either lands in the thread immediately ("direct") or is held as a pending **request** the recipient can accept later. The routing decision is made by `SendDirectMessageUseCase` against the **receiver's** gate; the sender's own `dm_permission` is irrelevant to outbound sends. ADR-006 records the why.

**The gate.** `dm_permission` and `dm_permission_exceptions` together define who can DM a given user. The enum values mean:

| `dm_permission` | Who can send to this user, in one line                                           |
|-----------------|----------------------------------------------------------------------------------|
| `everyone`      | Anyone. Exceptions are moot for inbound (but still matter if the user tightens). |
| `members`       | Anyone sharing an active group with the user, **plus** anyone on their exception list. |
| `nobody`        | Only people on the user's exception list. Read as "nobody EXCEPT exceptions". It is the default-deny floor, not an absolute block. |

`dm_permission_exceptions(user_id, allowed_peer_id)` means "user_id allows allowed_peer_id to send DMs to user_id, bypassing dm_permission". Rows are one-directional.

**Routing table** (receiver's gate evaluated in order; A is sender, B is recipient):

| Condition                                                        | Outcome   |
|------------------------------------------------------------------|-----------|
| A row exists in `dm_permission_exceptions(B, A)`                 | direct    |
| `B.dm_permission = 'everyone'`                                   | direct    |
| `B.dm_permission = 'members'` and A and B share an active group  | direct    |
| `B.dm_permission = 'members'` and no shared active group         | request   |
| `B.dm_permission = 'nobody'`                                     | request   |

There is no `DM_NOT_ALLOWED` 403 — a blocked send becomes a request. The HTTP response is a discriminated union: `{ type: 'message', ... }` or `{ type: 'request', requestId }`. When the route is `request`, the held send is upserted into `dm_requests` on `(sender_id, recipient_id)` — only the latest content survives per pending pair.

**Exception lifecycle.** Three write paths and one explicit remove path:

  - **Implicit on direct delivery.** When A's send to B routes to `direct`, the use case writes `exception(A, B)` (idempotent). Rationale: sending signals A consents to B replying, so B's reply should never be blocked by A's gate. Implicit-add does **not** fire when the route is `request` — until the conversation actually starts, no consent is recorded.
  - **Explicit on accept-request.** When B accepts A's pending request, the accept-request use case (1) inserts a `direct_messages` row from the held `dm_requests.content`, (2) writes `exception(B, A)`, (3) deletes the `dm_requests` row — all in one transaction. The materialized message uses the original send's `created_at` so the timing stays truthful.
  - **Manual add.** The profile-screen permissions section lets a user proactively add a peer to their exception list (a manual grant) without that peer needing to DM first.
  - **Manual revoke.** Same UI lets a user remove a peer. Future sends from the revoked peer go through `dm_permission` again. Existing thread history is unaffected — read-side has no policy check.

These three write paths grandfather active conversations naturally: both participants end up with an exception once each has sent at least one delivered message. A user tightening `dm_permission` to `nobody` will therefore not silently break threads where both sides have actively participated. One-sided/abandoned threads (sender wrote, recipient never replied) are **not** grandfathered — by design, since the recipient never signalled engagement. No historical backfill is planned: the implicit-add rule is forward-only.

**Read-side openness.** `GET /dm/:userId` performs **no policy check**. Once a thread exists (at least one `direct_messages` row), either participant can browse the full history. Changing `dm_permission` to `nobody` or revoking an exception blocks new sends from non-excepted peers but does not retroactively hide what was already delivered.

**Inbox structure.** Two cursor-paginated lists, mutually exclusive at the pair level:

  - `GET /dm` — **conversations**: one row per peer with at least one delivered `direct_messages` row. Backed by `direct_messages`; per-user `last_read_at` / `archived` come from `dm_conversation_state`.
  - `GET /dm/requests` — **pending requests** addressed to the caller, sourced from `dm_requests`.
  - A peer is never in both lists at once. Acceptance promotes a request into a conversation atomically.

**Per-user conversation state (`dm_conversation_state`).** Row `(user_id, peer_id)` is the user's caller-scoped state about the thread with `peer_id`:

  - `last_read_at` drives `unreadCount` in `/dm`. The query excludes the caller's own sends and uses `COALESCE(last_read_at, '-infinity')`, so an unread row defaults to "everything from the peer is unread".
  - `archived` is a hide-from-main-inbox flag. **It is independent of read state** — an archived thread still accumulates `unreadCount` when the peer sends, so a future "Archived (N)" filter chip can resurface re-engagement.
  - **Lifecycle (intended)**: the **sender's** row is created on send with `last_read_at = now()` (so the sender never sees their own sends as unread). The **recipient's** row is created on first `mark_dm_read` or on first `archive`. Until then, the recipient's row absence is read as `last_read_at = -infinity` and unread is honestly N.
  - **Mark-read**: WS `mark_dm_read { peerId }` and REST `POST /dm/:peerId/read` mirror `mark_group_read`. Side effect: upserts `last_read_at = now()`, emits `dm_summary_update` to the caller's user-scoped sockets so the badge clears across devices, emits `dm_read_receipt { readerId, peerId, lastReadAt }` into the sorted DM room, and clears the caller's push digest for `dm:{peerId}`. The REST path requests those side effects through `RealtimeEventsService`, not by injecting `ChatGateway`.

**Inbox liveness.** WS subscriptions mirror the group-summary pattern:

  - `watch_dm_inbox` / `unwatch_dm_inbox` — caller subscribes to user-scoped inbox events. No payload — the inbox is implicitly the caller's.
  - `dm_summary_update` — emitted per affected conversation when a new message lands, when the caller marks-read or archives, or when an accepted request promotes a request into a thread. Payload mirrors `group_summary_update`: `peerId`, last-message preview, `lastReadAt`, `unreadCount`, `archived`.
  - `dm_read_receipt` — emitted into `dm:{sortedA}:{sortedB}` after either participant marks the thread read. Payload is `readerId`, `peerId`, and ISO `lastReadAt`, where `peerId` is the other participant from the reader's perspective.

**Real-time message delivery.** `ChatGateway` exposes `join_dm` / `leave_dm` / `send_dm`. Joining is per pair, requires the caller (gateway rejects self-pair), and is not gated by `dm_permission` — the dm room exists regardless of policy. `send_dm` invokes `SendDirectMessageUseCase` and branches on the result:

  - `result.type === 'message'` → broadcast as `new_direct_message` into `dm:{sortedA}:{sortedB}`. The payload is always the message shape; clients never need to discriminate on `new_direct_message`.
  - `result.type === 'request'` → emit `dm_request_sent { requestId }` to the **sender's own socket** only (no room broadcast). Acts as an acknowledgement and lets the sender's UI flip to "pending request" state.

**Acceptance feedback.** When B accepts A's request, the server emits `dm_request_accepted` to A's user-scoped inbox room carrying the materialized message payload. The HTTP controller emits a `dm_request_accepted` realtime event after the accept transaction; `RealtimeModule` routes it to the `/chat` gateway. A's mobile updates the inbox + lifts any pending UI state. No DM push notification is fired on acceptance — only on subsequent new messages.

**Deactivated peers.** When a peer's `users.is_active = false`:

  - Existing threads stay visible in the inbox. The API substitutes a placeholder display name ("Conta desativada") and nulls the avatar so renderers don't leak stale identity.
  - New sends to a deactivated user return `404 RECIPIENT_NOT_FOUND` (already enforced — `SendDirectMessageUseCase` rejects on `!recipient.isActive`).
  - Hard-deleting a user (LGPD) cascades both `sender_id` and `recipient_id` FKs in `direct_messages` and removes their side of every thread. The peer loses the conversation too — an acceptable tradeoff for data erasure.

**Media DMs.** Rejected in v1 with `MEDIA_DM_NOT_SUPPORTED`. When media ships (depends on Phase 3 Slice 2 media upload), the routing model applies uniformly: a media-only DM to a blocked recipient becomes a request whose `content` is the media reference. Acceptance materializes both the media reference and any caption.

**Self-DM defense in depth.** Rejected at three layers: use case throws `CANNOT_DM_SELF`, DB enforces `chk_dm_distinct_participants` and `chk_dm_req_distinct`, gateway `join_dm` returns `{ok: false}` on self-pair. Each layer catches a different class of bug.

**Multi-device dedup.** DM push fan-out skips the push if the recipient currently has a socket joined to `dm:{sortedA}:{sortedB}` (mirrors group fan-out's "skip users connected to `group:{groupId}`" rule). Clients dedup `new_direct_message` WS payloads + any duplicate push payloads by message `id` as a fallback.

**Display names.** All endpoints (`/dm`, `/dm/requests`, `/dm/:userId`, WS payloads) JOIN `users.display_name` at query time — no snapshotting. A peer rename is reflected across history immediately on next read. The same applies to `users.avatar_url`.

**Privacy.** DM payloads expose `peerName` / `senderName` and avatar URLs. User coordinates and geohash are never returned — DMs are identity-revealing but not location-revealing. The user-to-user distance rule (see "Location privacy") applies: distance from one DM participant to another is never computed or exposed.

**Implementation notes and remaining gaps.** Open items must close before each
affected surface ships; struck-through items are already aligned.

  1. **Implicit-add-on-direct-send is not implemented.** `SendDirectMessageUseCase` does not currently write to `dm_permission_exceptions` on successful direct delivery. Until added, abandoned threads accumulate one-sided imbalance that breaks on permission tightening.
  2. ~~**No accept/decline request endpoint.**~~ **Closed (DM-TASK-C)**. `POST /dm/requests/:requestId/accept` materializes the held message into `direct_messages` (preserving the original `created_at`), writes `dm_permission_exceptions(recipient → sender)`, eager-inits `dm_conversation_state` for the sender, and deletes the `dm_requests` row — all in one transaction. `POST /dm/requests/:requestId/decline` deletes the `dm_requests` row (idempotent). Non-recipients receive 404 (existence hidden).
  3. ~~**Manual exception add/revoke endpoints + profile UI** are not implemented.~~ **Endpoints closed (DM-TASK-D)**. `GET /users/me/dm-exceptions` (paginated list joined to `users`; inactive peers hidden), `PUT /users/me/dm-exceptions/:peerId` (idempotent UPSERT; self-pair → 400; missing/inactive peer → 404), `DELETE /users/me/dm-exceptions/:peerId` (idempotent; self-pair → 400; returns 204 even when no row matched). Profile UI is a mobile follow-up.
  4. ~~**WS `send_dm` broadcasts the use case result verbatim**~~ **Closed (DM-TASK-B).** The gateway branches on `result.type`: materialized messages emit `new_direct_message`; requests emit `dm_request_sent { requestId }` to the sender socket only.
  5. ~~**`dm_request_accepted` WS event** is not implemented.~~ **Closed (DM-TASK-C, refactored by TD-13).** After the accept transaction commits, the controller emits a realtime event; `RealtimeModule` fans out `dm_request_accepted` to the sender's `dm_inbox:user:{senderId}` room. Recipient learns of the materialized message via the HTTP response.
  6. ~~**`watch_dm_inbox` / `unwatch_dm_inbox` / `dm_summary_update` WS events** are not implemented.~~ **Closed (DM-TASK-E).** The `/chat` gateway supports user-scoped DM inbox subscriptions and emits `dm_summary_update` from DM send, accept, mark-read, archive, and unarchive paths.
  7. ~~**`mark_dm_read` WS event + read receipt** are not implemented.~~ **Closed (Cluster B2).** `mark_dm_read` and `POST /dm/:peerId/read` both advance `last_read_at`, emit `dm_summary_update` to the reader's inbox room, emit `dm_read_receipt` to the sorted DM room, and clear the reader's push digest.
  8. ~~**Deactivated-peer placeholder substitution**~~ **Closed (DM-TASK-G)**. `listInbox` (peer + last-sender), `listConversation` / `findByIdWithSender` (via `baseQuery()`), `listRequests` (sender), `getDmSummary` (last-sender), and `acceptRequestAtomic`'s final SELECT (sender) all substitute `'Conta desativada'` + null avatar when joined `users.is_active = false`. `GetDirectMessageHistoryUseCase` no longer 404s on inactive recipients so the inbox-tap UX works end-to-end (send still 404s per spec). `listExceptions` is intentionally excluded — it filters inactive peers out (per Gap 3 spec, the row remains but is hidden from the manual exception list).
  9. ~~**DM push fan-out** is not implemented.~~ **Closed (DM-TASK-F).** Direct DM messages trigger best-effort push to the recipient's enabled devices; requests and accepted-request materialization remain push-free.
  10. ~~**Server-side push-vs-WS dedup** is not implemented.~~ **Closed (DM-TASK-F).** The server skips a DM push when the recipient has a socket in `dm:{a}:{b}`.
  11. **`dm_conversation_state` eager-init on the sender side** is not implemented. Current code is purely lazy; the sender's "own sends not unread" property is currently enforced by the `sender_id != caller` SQL filter, which works but means the sender's `last_read_at` is never advanced by their own activity.
  12. ~~**DTO naming inconsistency**~~ **Closed (DM-TASK-H)**. `DirectMessage.senderAvatar` renamed to `senderAvatarUrl` (`@localloop/shared-types@2.0.0`). The rename extended to the group `Message` types for symmetry across the whole chat surface. All avatar-bearing DM/group payloads (HTTP + WS) now use the `…AvatarUrl` suffix uniformly.

### Push notifications (Phase 4)

- Expo Push is the first provider, but API code depends on `IPushNotificationProvider` and stores provider-neutral device rows (`provider`, `platform`, `token`, `installationId`).
- `users.push_permission_status` is user-level preference state: `null` means not asked, `granted` means registered, `denied` means OS denied, and `disabled` means in-app opt-out.
- Mobile asks from Home only while status is `null`; once the user grants or denies permission, future changes happen from Profile only.
- Group message fan-out runs after successful `/chat` `send_message` delivery. `GroupMessageRealtimeService` emits `new_message`, then fires a best-effort notification use case that excludes the sender and users currently connected to `group:{groupId}`.
- Notification delivery uses enabled device rows for active group members whose user-level push permission is `granted`. Immediate Expo `DeviceNotRegistered` ticket errors disable the affected token.
- DM message fan-out runs after successful `/chat` `send_dm` delivery when the result is a materialized message. Request sends and request acceptance do not fire push notifications.
- Mobile notification routing handles group and DM taps, dismisses visible notifications for the open conversation, and suppresses foreground notifications when the open chat or a seen WS message already covers the payload.
- Chat push digests are per recipient + `conversationKey`, persisted in `chat_notification_digests`, and updated immediately on each offline message. The API keeps the newest 4 snippets, resets stale digest state after 30 minutes, and sends replacement pushes with a stable `collapseId` + Android `tag` (`chat:{recipientUserId}:{conversationKey}`). The first push uses normal sound; replacement pushes are silent. Opening or marking the chat read clears the digest.
- Receipt polling, Android large-icon avatars, and iOS notification service attachments are deferred.

### Media uploads (Phase 3)

- Clients upload directly to Supabase Storage via presigned URLs.
- API returns a presigned URL; client uploads; client notifies API with the final storage key.

### Pagination

- All list endpoints use **cursor-based pagination** (`?before=<cursor>&limit=<n>`).
- Never use OFFSET pagination.

---

## Decisions log

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| ADR-001 | NestJS + TypeORM for API | Accepted | 2024-03-18 |
| ADR-002 | PostgreSQL + PostGIS for geospatial | Accepted | 2024-03-18 |
| ADR-003 | Expo for React Native mobile | Accepted | 2024-03-18 |
| ADR-004 | Supabase for auth and storage | Accepted | 2024-03-18 |
| ADR-005 | Geohash precision 6 for location privacy | Accepted | 2024-04-06 |
| ADR-006 | DM request routing — exceptions as a first-class concept | Accepted | 2026-05-18 |
