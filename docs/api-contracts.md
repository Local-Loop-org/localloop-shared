# API Contracts — LocalLoop

> Every endpoint documented here is the contract between backend and frontend.
> Changes here require updating both sides before deployment.
> Sections marked **[PLANNED]** are not yet implemented.

---

## Conventions

**Base URL:** `/api/v1`
**Auth header:** `Authorization: Bearer {access_token}`
**Content-Type:** `application/json`

**Error format:**
```json
{
  "error": "ERROR_CODE",
  "message": "Human readable description"
}
```

**Pagination (cursor-based):**
```json
{
  "data": [...],
  "next_cursor": "uuid-or-null"
}
```
Query param: `?before=<cursor>&limit=<n>` (max limit defined per endpoint)

**Privacy rule:** coordinates (`lat`/`lng`) and `geohash` are **never** present in any response.

---

## Auth

### Exchange Google token

```
POST /auth/google
Auth: public

Request body:
{
  "token": string  // Google OAuth access token from Supabase Auth
}

Response 200:
{
  "accessToken": string,   // JWT, expires in 1h
  "refreshToken": string,  // JWT, expires in 30d
  "expiresIn": 3600,
  "isNewUser": boolean,
  "user": {
    "id": string,
    "displayName": string,
    "avatarUrl": string | null,
    "dmPermission": "nobody" | "members" | "everyone",
    "pushPermissionStatus": "granted" | "denied" | "disabled" | null,
    "provider": "google",
    "createdAt": string
  }
}

Errors:
  401 INVALID_TOKEN — token verification failed with Supabase
```

---

### Exchange Apple token

```
POST /auth/apple
Auth: public

Request body:
{
  "token": string  // Apple identity token from Supabase Auth
}

Response 200: (same shape as /auth/google, provider = "apple")

Errors:
  401 INVALID_TOKEN — token verification failed with Supabase
```

---

### Refresh access token [PLANNED — Phase 1 remaining]

```
POST /auth/refresh
Auth: public

Request body:
{
  "refreshToken": string
}

Response 200:
{
  "accessToken": string,
  "expiresIn": 3600
}

Errors:
  401 INVALID_TOKEN — refresh token expired or invalid
```

---

## Users [PLANNED — Phase 1 remaining]

### Get current user profile

```
GET /users/me
Auth: required

Response 200:
{
  "id": string,
  "displayName": string,
  "avatarUrl": string | null,
  "dmPermission": "nobody" | "members" | "everyone",
  "pushPermissionStatus": "granted" | "denied" | "disabled" | null,
  "provider": "google" | "apple",
  "createdAt": string
}
```

---

### Update current user profile

```
PATCH /users/me
Auth: required

Request body (all fields optional):
{
  "displayName": string,  // max 80 chars
  "dmPermission": "nobody" | "members" | "everyone"
}

Response 200: (same as GET /users/me)

Errors:
  422 VALIDATION_ERROR — invalid field values
```

---

### Update user location

```
PATCH /users/me/location
Auth: required

Request body:
{
  "lat": number,   // NOT stored — converted to geohash server-side
  "lng": number
}

Response 204: (no body)

Notes:
  - lat/lng are accepted but never persisted. Server derives geohash (precision 6) and stores only that.
  - Client should only call this if user moved >300m or opened the app.
```

---

## Push Notifications

Provider decision: Expo Push first, behind provider-neutral contracts so an FCM adapter can be added later without changing mobile screens or message use cases.

### Register current push device

```
PUT /users/me/push-devices/current
Auth: required

Request body:
{
  "installationId": string,
  "provider": "expo",
  "platform": "ios" | "android",
  "token": string
}

Response 200:
{
  "status": "registered"
}

Side effects:
  - upserts the current installation in push_devices
  - sets users.push_permission_status = 'granted'

Errors:
  400 INVALID_PUSH_TOKEN
  400 UNSUPPORTED_PUSH_PROVIDER
```

---

### Disable current push device

```
DELETE /users/me/push-devices/current?installationId=<id>&provider=expo
Auth: required

Response 204
```

---

### Update push permission

```
PATCH /users/me/push-permission
Auth: required

Request body:
{
  "status": "denied" | "disabled"
}

Response 204

Notes:
  - `null` means the app has not asked the user for notification permission yet.
  - `denied` records an OS-level denial and prevents automatic prompts.
  - `disabled` records an in-app opt-out and disables all registered devices.
  - `granted` is only written by registering a valid push device.
```

---

### Group message push fan-out

```
Trigger: successful send_message event on /chat
Provider: expo

Recipients:
  - enabled push_devices rows for active group members
  - users.push_permission_status = 'granted'
  - excludes the sender
  - excludes users currently connected to group:{groupId}

Notification:
{
  "title": "<group name>",
  "body": "<senderName>: <message preview>",
  "data": {
    "type": "group_message",
    "groupId": string,
    "messageId": string,
    "senderId": string
  }
}

Notes:
  - best-effort delivery; provider errors do not fail WebSocket message delivery.
  - preview collapses whitespace, is capped at 120 chars, and uses "..." when truncated.
  - immediate DeviceNotRegistered ticket errors disable the matching token.
  - tapping the notification is mobile-owned and does not deep-link to chat yet.
```

---

## Groups [PLANNED — Phase 2]

### Discover nearby groups

```
GET /groups/nearby
Auth: required

Query params:
  lat: number
  lng: number

Response 200:
{
  "data": [
    {
      "id": string,
      "name": string,
      "description": string | null,
      "anchorType": "establishment" | "neighborhood" | "condo" | "event" | "city",
      "anchorLabel": string,
      "distanceMeters": number,
      "privacy": "open" | "approval_required",
      "memberCount": number,
      "myRole": "owner" | "moderator" | "member" | null,
      "memberStatus": "active" | "pending" | null
    }
  ]
}

Notes:
  - distanceMeters is the haversine distance between the requesting user's lat/lng and the group's stored anchor_lat/anchor_lng. Raw group coordinates are never returned.
  - Returns groups whose anchorGeohash shares a prefix with the user's geohash or is a neighbor cell.
  - Groups where the caller's group_members.status = 'banned' are excluded from the response entirely.
  - myRole reflects the caller's role only when memberStatus = 'active'; PENDING and non-members both receive null.
  - memberStatus is 'active' | 'pending' | null — 'banned' is never returned (see filter note above).
```

---

### List my groups

```
GET /groups/me
Auth: required, active memberships only
Query: ?limit=20&cursor=<cursor>  // limit max 50

Response 200:
{
  "data": [
    {
      "id": string,
      "name": string,
      "anchorType": "establishment" | "neighborhood" | "condo" | "event" | "city",
      "anchorLabel": string,
      "memberCount": number,
      "myRole": "owner" | "moderator" | "member",
      "lastActivityAt": string,  // ISO 8601; last message or joined_at fallback
      "lastMessage": {
        "content": string | null,
        "senderName": string,
        "createdAt": string
      } | null,
      "lastReadAt": string | null,
      "unreadCount": number
    }
  ],
  "next_cursor": string | null
}

Notes:
  - unreadCount counts non-deleted messages created after lastReadAt, excluding messages sent by the caller.
  - lastReadAt is persisted on group_members and is advanced by the Socket.IO mark_group_read event.
```

---

### Create group

```
POST /groups
Auth: required

Request body:
{
  "name": string,          // max 80 chars
  "description": string,   // optional, max 500 chars
  "anchorType": "establishment" | "neighborhood" | "condo" | "event" | "city",
  "anchorLabel": string,   // max 100 chars
  "lat": number,           // stored as anchor_lat and also derived to anchor_geohash server-side
  "lng": number,
  "privacy": "open" | "approval_required"
}

Response 201:
{
  "id": string,
  "name": string,
  "anchorType": string,
  "anchorLabel": string,
  "privacy": string,
  "memberCount": 1,
  "myRole": "owner"
}

Errors:
  422 VALIDATION_ERROR
```

---

### Get group detail

```
GET /groups/:id
Auth: required

Response 200:
{
  "id": string,
  "name": string,
  "description": string | null,
  "anchorType": string,
  "anchorLabel": string,
  "privacy": string,
  "radiusKm": number,
  "memberCount": number,
  "myRole": "owner" | "moderator" | "member" | null,  // null = not a member
  "createdAt": string  // ISO-8601
}

Errors:
  404 GROUP_NOT_FOUND
```

---

### Update group (owner or moderator)

```
PATCH /groups/:id
Auth: required, owner or moderator

Request body (all fields optional):
{
  "name": string,        // 1–80 chars
  "description": string | null,  // max 500 chars
  "anchorLabel": string, // 1–100 chars
  "privacy": "open" | "approval_required",
  "radiusKm": number     // RADIUS_KM_MIN–RADIUS_KM_MAX
}

Response 200: (same shape as GET /groups/:id)

Errors:
  403 NOT_PRIVILEGED — caller is not owner or moderator
  404 GROUP_NOT_FOUND
  422 VALIDATION_ERROR
```

---

### Join group

```
POST /groups/:id/join
Auth: required

Response 200 (open group):
{
  "status": "joined",
  "role": "member"
}

Response 202 (approval_required group):
{
  "status": "pending"
}

Errors:
  404 GROUP_NOT_FOUND
  409 ALREADY_MEMBER
  403 BANNED — user was banned from this group
```

---

### Leave group

```
DELETE /groups/:id/members/me
Auth: required

Response 204

Errors:
  404 GROUP_NOT_FOUND
  403 OWNER_CANNOT_LEAVE — owner must transfer ownership first
```

---

## Group Members (moderation) [PLANNED — Phase 2]

### List members

```
GET /groups/:id/members
Auth: required, must be a member
Query: ?limit=50&before=<cursor>

Response 200:
{
  "data": [
    { "userId": string, "displayName": string, "avatarUrl": string | null, "role": string }
  ],
  "next_cursor": string | null
}
```

Returns only members whose `status = 'active'`. Banned and pending memberships are excluded.

---

### List banned members (owner or moderator)

```
GET /groups/:id/members/banned
Auth: required, active owner or moderator
Query: ?limit=50&before=<cursor>  // limit max 100, default 50

Response 200:
{
  "data": [
    { "userId": string, "displayName": string, "avatarUrl": string | null, "role": string }
  ],
  "next_cursor": string | null
}

Errors:
  404 GROUP_NOT_FOUND
  403 FORBIDDEN — caller is not an active owner or moderator
```

Notes:
- Response shape mirrors `GET /groups/:id/members` (same `GroupMemberDto`). Combine with `POST /groups/:id/members/:userId/unban` to lift a ban.
- Cursor is the row's `joined_at` (when the user originally joined). The schema has no `banned_at` column today, so the response cannot indicate when the ban occurred.

---

### Approve / reject join request (owner or moderator)

```
PATCH /groups/:id/requests/:requestId
Auth: required, owner or moderator

Request body:
{
  "action": "approve" | "reject"
}

Response 200:
{
  "status": "approved" | "rejected"
}

Errors:
  403 FORBIDDEN
  404 REQUEST_NOT_FOUND
```

---

### Ban member

```
DELETE /groups/:id/members/:userId
Auth: required, owner or moderator

Response 204

Errors:
  403 FORBIDDEN — cannot ban the owner
  404 MEMBER_NOT_FOUND
```

---

### Unban member

```
POST /groups/:id/members/:userId/unban
Auth: required, owner or moderator
Request body: (empty)

Response 204

Errors:
  403 FORBIDDEN — caller is not an active owner or moderator
  404 MEMBER_NOT_FOUND
  400 TARGET_NOT_BANNED — the member exists but is not currently banned
```

Notes:
- Unban hard-deletes the `group_members` row for the target user. The user is treated as a non-member afterwards and can re-discover the group and request to join again as a regular member.
- `memberCount` is unchanged: banned rows are not counted, so removing one does not affect the total.
- Operation is idempotent at the repository layer: a second call with the same arguments is a no-op (returns 404 because the row is gone).

---

### Promote member (to moderator)

```
POST /groups/:id/members/:userId/promote
Auth: required, owner only (active)
Request body: (empty)

Response 204

Errors:
  403 FORBIDDEN — caller is not the group's active owner
  403 CANNOT_CHANGE_OWNER_ROLE — the target is the group owner
  404 MEMBER_NOT_FOUND
  400 TARGET_NOT_ACTIVE — target exists but status is BANNED or PENDING
  400 ALREADY_MODERATOR — target is already a moderator
```

Notes:
- Only the active OWNER can change roles. This prevents moderator chain-promotion.
- `memberCount` is unchanged.

---

### Demote member (to regular member)

```
POST /groups/:id/members/:userId/demote
Auth: required, owner only (active)
Request body: (empty)

Response 204

Errors:
  403 FORBIDDEN — caller is not the group's active owner
  403 CANNOT_CHANGE_OWNER_ROLE — the target is the group owner
  404 MEMBER_NOT_FOUND
  400 TARGET_NOT_ACTIVE — target exists but status is BANNED or PENDING
  400 NOT_A_MODERATOR — target is not currently a moderator
```

Notes:
- Only the active OWNER can change roles.
- The demoted member retains their `group_members` row, `joined_at`, and read state — only `role` flips from MODERATOR to MEMBER.

---

## Messages [PLANNED — Phase 3]

### Get message history

```
GET /groups/:id/messages
Auth: required, active member
Query: ?limit=50&before=<cursor>

Response 200:
{
  "data": [
    {
      "id": string,
      "senderId": string,
      "senderName": string,
      "senderAvatarUrl": string | null,
      "content": string | null,
      "mediaUrl": string | null,
      "mediaType": "image" | "video" | null,
      "createdAt": string  // ISO 8601
    }
  ],
  "next_cursor": string | null
}
```

---

### Get media upload URL

```
POST /groups/:id/messages/media-url
Auth: required, active member

Request body:
{
  "mimeType": "image/jpeg" | "image/png" | "video/mp4"
}

Response 200:
{
  "uploadUrl": string,   // presigned Supabase Storage URL
  "storageKey": string   // key to send back after upload
}

Notes: client uploads directly to Supabase, then sends the storageKey via WebSocket
```

---

## Direct Messages

> See architecture.md → "Direct messages (Phase 4)" for the send-routing rules,
> the permission-exception model, and the read-side openness contract that
> these endpoints implement.

### List conversations (inbox)

```
GET /dm
Auth: required
Query: ?limit=20&cursor=<opaque>     // limit 1..50, default 20

Response 200:
{
  "data": [
    {
      "peerId": string,
      "peerName": string,
      "peerAvatarUrl": string | null,
      "lastMessage": {
        "content": string | null,
        "senderName": string,
        "createdAt": string             // ISO 8601
      },
      "unreadCount": number,
      "archived": boolean
    }
  ],
  "next_cursor": string | null         // opaque (lastMessageAt + peerId)
}

notes: one row per peer with at least one delivered message. Ordered by
       lastMessageAt DESC. unreadCount and archived come from
       dm_conversation_state and are caller-scoped. Pending requests are
       NOT included here — see GET /dm/requests.
```

### List pending requests

```
GET /dm/requests
Auth: required
Query: ?limit=20&cursor=<opaque>     // limit 1..50, default 20

Response 200:
{
  "data": [
    {
      "id": string,                    // dm_requests.id; pass to accept/decline
      "senderId": string,
      "senderName": string,
      "senderAvatarUrl": string | null,
      "content": string | null,
      "createdAt": string
    }
  ],
  "next_cursor": string | null         // opaque (createdAt + requestId)
}

notes: requests addressed to the caller (i.e. caller is the recipient).
       Sourced from dm_requests. See POST /dm/requests/:requestId/accept
       and POST /dm/requests/:requestId/decline to resolve a row.
```

### Accept DM request

```
POST /dm/requests/:requestId/accept
Auth: required

Response 200 (the materialized message — same shape as POST /dm/:userId's `type:'message'` branch but without the discriminator):
{
  "id": string,
  "senderId": string,
  "senderName": string,
  "senderAvatarUrl": string | null,
  "recipientId": string,
  "content": string | null,
  "mediaUrl": string | null,
  "mediaType": "image" | "video" | null,
  "createdAt": string                  // ISO 8601 — original send's timestamp, NOT acceptance time
}

notes: caller must be the request's recipient. Single transaction:
         1) materializes the held message into direct_messages preserving original created_at
         2) writes dm_permission_exceptions(recipient → sender)
         3) eager-inits dm_conversation_state for the sender (last_read_at = now())
         4) deletes the dm_requests row
       After the tx commits, dm_request_accepted is emitted to the original
       sender's user-scoped sockets carrying the same payload.

Errors:
  404 DM_REQUEST_NOT_FOUND   — no row with that id, OR caller is not the recipient
                               (existence hidden by design)
```

### Decline DM request

```
POST /dm/requests/:requestId/decline
Auth: required

Response 204 (no body)

notes: caller must be the request's recipient. Deletes the dm_requests row.
       Idempotent: returns 204 even when the row was already gone (e.g. the
       sender's permission shifted and the request fell out via accept/decline
       race). No WS event is emitted to the sender on decline.

Errors:
  404 DM_REQUEST_NOT_FOUND   — caller is not the recipient AND the row exists
                               (existence hidden; if the row is gone, returns 204)
```

### Get DM history

```
GET /dm/:userId
Auth: required
Query: ?limit=50&before=<cursor>     // limit 1..100, default 50

Response 200:
{
  "data": [
    {
      "id": string,
      "senderId": string,
      "senderName": string,
      "senderAvatarUrl": string | null,
      "recipientId": string,
      "content": string | null,
      "mediaUrl": string | null,
      "mediaType": "image" | "video" | null,
      "createdAt": string             // ISO 8601, also used as the next cursor
    }
  ],
  "next_cursor": string | null
}

notes: ordered newest-first; pagination uses created_at as cursor. No DM policy
       check on read — once a thread exists, either participant can browse it.

Errors:
  400 CANNOT_DM_SELF       — :userId equals the caller
  404 RECIPIENT_NOT_FOUND  — user missing or inactive
```

### Send DM

```
POST /dm/:userId
Auth: required
Body:
{
  "content": string   // 1..2000 chars
}

Response 201 (discriminated union — branch on `type`):

  // routing landed in the thread:
  {
    "type": "message",
    "id": string,
    "senderId": string,
    "senderName": string,
    "senderAvatarUrl": string | null,
    "recipientId": string,
    "content": string | null,
    "mediaUrl": string | null,
    "mediaType": "image" | "video" | null,
    "createdAt": string
  }

  // routing held the send as a pending request:
  {
    "type": "request",
    "requestId": string                // dm_requests.id
  }

notes: see architecture.md "Direct messages → Send-time routing" for the
       full rule table. There is no DM_NOT_ALLOWED 403 — a blocked send
       becomes a request instead. Media DMs are not supported in v1;
       mediaUrl / mediaType are always null.

Errors:
  400 CANNOT_DM_SELF             — :userId equals the caller
  400 EMPTY_MESSAGE              — trimmed content is empty
  400 MEDIA_DM_NOT_SUPPORTED     — body included media fields (reserved for v2)
  404 RECIPIENT_NOT_FOUND        — user missing or inactive
```

---

## DM exceptions

The `dm_permission_exceptions` table is the source of truth for "peer X may DM user Y directly even if Y's `dm_permission` would otherwise route the message into `dm_requests`." Rows are written implicitly by `POST /dm/:userId` (sender → recipient on direct delivery, DM-TASK-A) and `POST /dm/requests/:requestId/accept` (recipient → sender on acceptance, DM-TASK-C). The endpoints below let a user manage their own list manually.

### List exceptions

```
GET /users/me/dm-exceptions
Auth: required
Query: ?limit=20&cursor=<opaque>     // limit 1..50, default 20

Response 200:
{
  "data": [
    {
      "peerId": string,
      "displayName": string,
      "avatarUrl": string | null,
      "createdAt": string             // ISO 8601, when the exception was created
    }
  ],
  "next_cursor": string | null         // opaque (createdAt + peerId)
}

notes: caller-scoped. Inactive peers are filtered out — the row remains in
       the table but is hidden from this listing (DM-TASK-G adds placeholder
       substitution for inbox/request read paths that must keep deactivated
       peers visible).
```

### Add an exception (pre-grant)

```
PUT /users/me/dm-exceptions/:peerId
Auth: required

Response 204 (no body)

notes: idempotent UPSERT — calling with the same peerId twice succeeds both
       times. After the row exists, DMs from peerId to the caller will be
       routed directly regardless of the caller's `dm_permission` setting.

Errors:
  400 CANNOT_EXCEPTION_SELF      — peerId equals the caller
  404 PEER_NOT_FOUND             — user missing or inactive
```

### Remove an exception (revoke)

```
DELETE /users/me/dm-exceptions/:peerId
Auth: required

Response 204 (no body)

notes: idempotent DELETE — returns 204 even when no row matched (e.g. the
       exception was already revoked, or never existed). Removing an
       exception does NOT block future DMs on its own — it just restores
       normal `dm_permission` routing. After revoke, the next DM from peerId
       to caller falls under the caller's current `dm_permission` rules.

Errors:
  400 CANNOT_EXCEPTION_SELF      — peerId equals the caller
```

### List exception candidates

```
GET /users/me/dm-exception-candidates
Auth: required
Query: ?limit=20&cursor=<opaque>&q=<string>
       // limit 1..50, default 20
       // cursor: opaque base64url JSON, omit on first page
       // q: optional case-insensitive substring on display_name; server
       //    trims and treats empty/whitespace-only as "no search";
       //    max length 100

Response 200:
{
  "data": [
    {
      "userId": string,
      "displayName": string,
      "avatarUrl": string | null
    }
  ],
  "next_cursor": string | null         // opaque (lower(display_name) + userId)
}

notes: returns active users `u` such that:
         1. u.is_active = true
         2. u.id != caller.id
         3. there exists a group g where both caller and u are rows in
            `group_members` with status = 'active' (banned/pending excluded
            on either side)
         4. no row exists in `dm_permission_exceptions` with
            (user_id = caller.id, allowed_peer_id = u.id) — already-added
            peers are hidden so the picker only shows addable candidates
         5. when `q` is provided after trimming,
            lower(u.display_name) LIKE '%' || lower(q) || '%'
       Ordering: lower(display_name) ASC, u.id ASC (stable secondary key).
       Cursor encodes { displayName, userId }; clients MUST reset the
       cursor when `q` changes. Empty result is { data: [], next_cursor: null }
       — no 404.

Errors:
  400 BAD_REQUEST                — limit out of range, q over max length,
                                   or malformed cursor
```

---

## WebSocket Events

**Connection:** `wss://<host>/chat`
**Auth:** pass JWT in handshake query: `?token=<accessToken>`

### Client → Server

```
event: join_group
payload: { "groupId": string }

event: leave_group
payload: { "groupId": string }

event: watch_presence
payload: { "groupIds": string[] }  // max 50 unique group ids
notes: subscribes to read-only presence updates without joining counted chat rooms.
       Open groups are watchable by any authenticated user; approval-required
       groups are watchable only by active members.

event: unwatch_presence
payload: { "groupIds": string[] }

event: watch_group_summaries
payload: { "groupIds": string[] }  // max 50 unique group ids
notes: subscribes to user-specific my-groups summary updates.
       Only ACTIVE members may watch a group's summary.

event: unwatch_group_summaries
payload: { "groupIds": string[] }

event: mark_group_read
payload: { "groupId": string }
notes: advances the caller's persisted group_members.last_read_at and emits a
       fresh group_summary_update to the socket.

event: send_message
payload:
{
  "groupId": string,
  "content": string | null,
  "storageKey": string | null,   // from media upload flow
  "mediaType": "image" | "video" | null
}

event: join_dm
payload: { "userId": string }  // the other participant; ack { ok: boolean }
notes: joins the conversation room dm:{sortedUserA}:{sortedUserB}. Rejects when
       userId equals the caller (returns { ok: false } and emits ERROR).

event: leave_dm
payload: { "userId": string }  // the other participant

event: send_dm
payload:
{
  "recipientId": string,
  "content": string | null
}
notes: same routing as POST /dm/:userId. Server branches on the use case
       result.type:
         - 'message' → broadcast as new_direct_message into dm:{sortedA}:{sortedB}.
         - 'request' → emit dm_request_sent { requestId } to the sender's
           socket only (no room broadcast).
       On failure the sender receives an ERROR event with the use case's error
       code.

event: mark_dm_read
payload: { "peerId": string }
notes: advances the caller's persisted dm_conversation_state.last_read_at and
       emits a fresh dm_summary_update to the caller's user-scoped sockets.
       Mirrors mark_group_read. [PLANNED — see architecture.md "Open gaps"]

event: watch_dm_inbox
payload: {}
notes: subscribes the caller to dm_summary_update events for every conversation
       in their inbox. No per-peer subscription needed. Mirrors
       watch_group_summaries but is user-scoped, so no payload.
       [PLANNED — see architecture.md "Open gaps"]

event: unwatch_dm_inbox
payload: {}
```

### Server → Client

```
event: new_message
payload:
{
  "id": string,
  "groupId": string,
  "senderId": string,
  "senderName": string,
  "senderAvatarUrl": string | null,
  "content": string | null,
  "mediaUrl": string | null,
  "mediaType": string | null,
  "createdAt": string
}
trigger: a member of the group sends a message.
side effect: eligible offline group members may receive a best-effort push notification.

event: message_deleted
payload: { "messageId": string, "groupId": string }
trigger: moderator soft-deletes a message

event: member_joined
payload: { "groupId": string, "userId": string, "displayName": string }
trigger: a user joins an open group

event: presence_update
payload: { "groupId": string, "count": number }
trigger: any counted chat socket joins/leaves the group room or disconnects;
         also emitted immediately after a socket starts watching that group
caveat: same user on multiple devices is counted multiple times in v1

event: new_direct_message
payload:
{
  "id": string,
  "senderId": string,
  "senderName": string,
  "senderAvatarUrl": string | null,
  "recipientId": string,
  "content": string | null,
  "mediaUrl": string | null,
  "mediaType": string | null,
  "createdAt": string
}
trigger: send_dm or POST /dm/:userId resolved to a delivered message
         (result.type === 'message'). Acceptance of a pending request also
         emits this event into the dm room as part of the materialization.
notes: only delivered to sockets joined to dm:{sortedA}:{sortedB}. Server is
       responsible for never emitting a non-message payload on this channel;
       see architecture.md "Open gaps" for the current send_dm code that does
       not yet branch.

event: dm_request_sent
payload: { "requestId": string }
trigger: send_dm or POST /dm/:userId resolved to a request
         (result.type === 'request'). Sender-only ack — not broadcast.
notes: lets the sender's UI show a pending-request state.

event: dm_request_accepted
payload:
{
  "id": string,
  "senderId": string,
  "senderName": string,
  "senderAvatarUrl": string | null,
  "recipientId": string,
  "content": string | null,
  "mediaUrl": string | null,
  "mediaType": string | null,
  "createdAt": string               // original send's created_at
}
trigger: recipient accepts a pending request via POST /dm/requests/:requestId/accept.
notes: emitted to every connected socket of the original sender (multi-device
       safe) so the sender's inbox flips from "pending" to "active conversation"
       live. Recipient learns of the materialized message via the HTTP response,
       not via this event. No push notification fires on acceptance. Payload is
       the materialized message — same flat shape as new_direct_message; the
       sender derives peerId = recipientId from the payload.

event: dm_summary_update
payload:
{
  "peerId": string,
  "lastMessage": {
    "content": string | null,
    "senderName": string,
    "createdAt": string
  } | null,
  "lastReadAt": string | null,
  "unreadCount": number,
  "archived": boolean
}
trigger: emitted after watch_dm_inbox, mark_dm_read, archive/unarchive, and
         on every new message in any of the caller's threads.
notes: payload is caller-specific; unreadCount excludes messages sent by the
       caller. Mirrors group_summary_update. [PLANNED — see architecture.md
       "Open gaps"]

event: group_summary_update
payload:
{
  "groupId": string,
  "lastActivityAt": string,
  "lastMessage": {
    "content": string | null,
    "senderName": string,
    "createdAt": string
  } | null,
  "lastReadAt": string | null,
  "unreadCount": number
}
trigger: immediately after watch_group_summaries, mark_group_read, and new group messages.
notes: payload is user-specific; unreadCount excludes messages sent by the recipient.

event: error
payload: { "code": string, "message": string }
trigger: invalid action (e.g. self-DM, empty content, recipient not found).
notes: DMs blocked by dm_permission do not produce an ERROR — they become a
       pending request. See architecture.md "Direct messages → Send-time
       routing".
```
