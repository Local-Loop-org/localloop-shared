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
      "senderAvatar": string | null,
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

## Direct Messages [PLANNED — Phase 5]

### Get DM history

```
GET /dm/:userId
Auth: required
Query: ?limit=50&before=<cursor>

Response 200: (same shape as group messages)

Errors:
  403 DM_NOT_ALLOWED — recipient's dm_permission blocks this sender
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

event: send_message
payload:
{
  "groupId": string,
  "content": string | null,
  "storageKey": string | null,   // from media upload flow
  "mediaType": "image" | "video" | null
}

event: join_dm
payload: { "userId": string }  // the other participant
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
  "senderAvatar": string | null,
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

event: error
payload: { "code": string, "message": string }
trigger: invalid action (e.g. DM to user with dm_permission = 'nobody')
```
