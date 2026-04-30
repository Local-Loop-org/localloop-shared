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
    "provider": "google"
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
  "provider": "google" | "apple"
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
      "memberCount": number
    }
  ]
}

Notes:
  - distanceMeters is the haversine distance between the requesting user's lat/lng and the group's stored anchor_lat/anchor_lng. Raw group coordinates are never returned.
  - Returns groups whose anchorGeohash shares a prefix with the user's geohash or is a neighbor cell.
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
  "memberCount": number,
  "myRole": "owner" | "moderator" | "member" | null  // null = not a member
}

Errors:
  404 GROUP_NOT_FOUND
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

## WebSocket Events [PLANNED — Phase 3]

**Connection:** `wss://<host>/chat`
**Auth:** pass JWT in handshake query: `?token=<accessToken>`

### Client → Server

```
event: join_group
payload: { "groupId": string }

event: leave_group
payload: { "groupId": string }

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
trigger: a member of the group sends a message

event: message_deleted
payload: { "messageId": string, "groupId": string }
trigger: moderator soft-deletes a message

event: member_joined
payload: { "groupId": string, "userId": string, "displayName": string }
trigger: a user joins an open group

event: error
payload: { "code": string, "message": string }
trigger: invalid action (e.g. DM to user with dm_permission = 'nobody')
```
