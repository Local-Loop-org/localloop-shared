# Data Model — LocalLoop

> Source of truth for database schema.
> Update this file whenever a migration is created.
> Sections marked **[PLANNED]** are not yet migrated.

---

## Entities

### users ✓ migrated

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Internal user ID |
| provider_id | VARCHAR(255) | NOT NULL | ID from OAuth provider |
| provider | provider_enum | NOT NULL | `google` or `apple` |
| display_name | VARCHAR(80) | NOT NULL | Public display name |
| avatar_url | TEXT | nullable | Profile picture URL |
| geohash | CHAR(6) | nullable | Current location (precision 6 ≈ 1.2km²) |
| dm_permission | dm_permission_enum | NOT NULL, DEFAULT `members` | Who can send DMs |
| push_permission_status | push_permission_status_enum | nullable | `null` = not asked yet; otherwise latest OS/app notification preference |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | Soft-ban flag |
| last_seen_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Used for lazy location updates |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**Relationships:** none yet (root entity)

**Indexes:**
- `idx_users_geohash` on `(geohash)` — geohash-based proximity queries

**Unique constraint:** `(provider_id, provider)`

---

### groups [PLANNED — Phase 2]

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| name | VARCHAR(80) | NOT NULL | Display name |
| description | TEXT | nullable | |
| anchor_type | anchor_type_enum | NOT NULL | Type of physical anchor |
| anchor_lat | NUMERIC(9,6) | NOT NULL | Anchor latitude (used for distance computation; never returned to clients) |
| anchor_lng | NUMERIC(9,6) | NOT NULL | Anchor longitude (used for distance computation; never returned to clients) |
| anchor_geohash | CHAR(6) | NOT NULL | Anchor geohash for cell-based discovery (never returned to clients) |
| anchor_label | VARCHAR(100) | nullable | Optional human-readable location label |
| privacy | group_privacy_enum | NOT NULL, DEFAULT `open` | Join policy |
| send_text_perm | message_permission_enum | NOT NULL, DEFAULT `all_members` | Who may send text messages |
| send_media_perm | message_permission_enum | NOT NULL, DEFAULT `all_members` | Who may send media (enforced in Phase 3 Slice 2) |
| owner_id | UUID | FK → users.id, NOT NULL | Creator |
| member_count | INT | NOT NULL, DEFAULT 0 | Denormalized counter |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**Indexes:**
- `idx_groups_anchor_geohash` on `(anchor_geohash)` — discovery queries
- `idx_groups_owner_id` on `(owner_id)` — "my groups" queries

---

### group_members [PLANNED — Phase 2]

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| group_id | UUID | FK → groups.id, NOT NULL | |
| user_id | UUID | FK → users.id, NOT NULL | |
| role | member_role_enum | NOT NULL, DEFAULT `member` | `owner` / `moderator` / `member` |
| status | member_status_enum | NOT NULL, DEFAULT `active` | `active` / `pending` / `banned` |
| joined_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| last_read_at | TIMESTAMPTZ | nullable | User-specific read watermark for group unread counts |

**Unique constraint:** `(group_id, user_id)`

**Indexes:**
- `idx_group_members_group_id` on `(group_id)` — list members
- `idx_group_members_user_id` on `(user_id)` — "groups I belong to"

---

### group_join_requests [PLANNED — Phase 2]

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| group_id | UUID | FK → groups.id, NOT NULL | |
| user_id | UUID | FK → users.id, NOT NULL | |
| status | request_status_enum | NOT NULL, DEFAULT `pending` | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| resolved_at | TIMESTAMPTZ | nullable | |
| resolved_by | UUID | FK → users.id, nullable | Moderator or owner |

**Unique constraint:** `(group_id, user_id)` where `status = 'pending'`

---

### messages [PLANNED — Phase 3]

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| group_id | UUID | FK → groups.id, NOT NULL | |
| sender_id | UUID | FK → users.id, NOT NULL | |
| content | TEXT | nullable | Text body (null if media-only) |
| media_url | TEXT | nullable | Supabase Storage key |
| media_type | media_type_enum | nullable | `image` or `video` |
| is_deleted | BOOLEAN | NOT NULL, DEFAULT false | Soft delete for moderation |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Cursor for pagination |

**Indexes:**
- `idx_messages_group_created` on `(group_id, created_at DESC)` — chat history cursor pagination

---

### push_devices ✓ migrated

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| user_id | UUID | FK → users.id, NOT NULL, ON DELETE CASCADE | Owner of the installation |
| installation_id | VARCHAR(128) | NOT NULL | Stable app-install ID generated on device |
| provider | push_provider_enum | NOT NULL | Active provider (`expo` in v1) |
| platform | device_platform_enum | NOT NULL | `ios` or `android` |
| token | TEXT | NOT NULL | Provider token; Expo push token in v1 |
| enabled | BOOLEAN | NOT NULL, DEFAULT true | Disabled on in-app opt-out or device disable |
| last_seen_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Updated on registration/upsert |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| disabled_at | TIMESTAMPTZ | nullable | Last disable timestamp |

**Unique constraint:** `(user_id, installation_id, provider)`

**Indexes:**
- `idx_push_devices_user_id` on `(user_id)`

---

### direct_messages

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| sender_id | UUID | FK → users.id, NOT NULL, ON DELETE CASCADE | |
| recipient_id | UUID | FK → users.id, NOT NULL, ON DELETE CASCADE | |
| content | TEXT | nullable | |
| media_url | TEXT | nullable | media DMs are reserved for a future slice; rejected at the use case in v1 |
| media_type | media_type_enum | nullable | as above |
| is_deleted | BOOLEAN | NOT NULL, DEFAULT false | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**Check constraint:** `chk_dm_distinct_participants`: `sender_id <> recipient_id` — the use case also rejects self-DMs.

**Indexes:**
- `idx_dm_conversation` on `(LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id), created_at DESC)` — functional index, serves both directions of the conversation in a single sort.

---

### dm_requests

Pending direct-message sends that the recipient's `dm_permission` (or lack of a shared group) blocked from landing in `direct_messages`. See `architecture.md → "Direct messages → Send-time routing"`.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Used as the requestId returned from POST /dm/:userId |
| sender_id | UUID | FK → users.id, NOT NULL, ON DELETE CASCADE | |
| recipient_id | UUID | FK → users.id, NOT NULL, ON DELETE CASCADE | |
| content | TEXT | nullable | The original send payload |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**Check constraint:** `chk_dm_req_distinct`: `sender_id <> recipient_id`.

**Unique constraint:** `(sender_id, recipient_id)` — at most one pending request per direction.

---

### dm_conversation_state

Per-user, per-peer state about a DM thread. Caller-scoped: row `(A, B)` is A's state about the conversation with B.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| user_id | UUID | FK → users.id, NOT NULL, ON DELETE CASCADE | Owner of this state row |
| peer_id | UUID | FK → users.id, NOT NULL, ON DELETE CASCADE | The other participant |
| last_read_at | TIMESTAMPTZ | nullable | Read watermark; drives unread counts in GET /dm |
| archived | BOOLEAN | NOT NULL, DEFAULT false | Caller hid the thread from the inbox |

**Primary key:** `(user_id, peer_id)`.

---

### dm_permission_exceptions

Durable allow-list, one row per acceptance. Once a row exists, `SendDirectMessageUseCase` skips the policy check for that pair — even if `dm_permission` later flips to `nobody`. Exceptions are one-directional: `(A, B)` means A allows B to DM A.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| user_id | UUID | FK → users.id, NOT NULL, ON DELETE CASCADE | The recipient who granted the exception |
| allowed_peer_id | UUID | FK → users.id, NOT NULL, ON DELETE CASCADE | The sender now allowed |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**Primary key:** `(user_id, allowed_peer_id)`.

---

## Enums

```sql
-- provider_enum
'google'
'apple'

-- dm_permission_enum
'nobody'    -- rejects all DMs with 403
'members'   -- accepts only if sender shares a group with recipient
'everyone'  -- accepts from any authenticated user

-- push_permission_status_enum
'granted'
'denied'
'disabled'

-- push_provider_enum
'expo'

-- device_platform_enum
'ios'
'android'

-- anchor_type_enum
'establishment'  -- bar, restaurant, shop (~100m radius)
'neighborhood'   -- bairro (~2km radius)
'condo'          -- condominium (exact address)
'event'          -- temporary event (~500m radius)
'city'           -- entire city

-- group_privacy_enum
'open'              -- user joins immediately
'approval_required' -- creates a group_join_request (pending)

-- message_permission_enum
'admin_only'        -- only OWNER/MODERATOR may send
'members_in_radius' -- sender's users.geohash must be the group anchor cell or one of its 8 neighbors
'all_members'       -- any ACTIVE member

-- member_role_enum
'owner'      -- full permissions, created the group
'moderator'  -- can remove messages and members
'member'     -- standard member

-- member_status_enum
'active'   -- normal member
'pending'  -- join request sent, awaiting approval
'banned'   -- removed by moderator/owner, cannot rejoin

-- media_type_enum
'image'
'video'

-- request_status_enum
'pending'
'approved'
'rejected'
```

---

## Key design decisions

See `architecture.md` for full rationale. Summary: geohash for privacy (no coords stored), soft deletes for moderation audit trail, cursor pagination for chat performance, denormalized counters to avoid COUNT(*).

---

## Migration history

| Migration | Description | Date |
|-----------|-------------|------|
| 1710770000000-InitialSetup | PostGIS, all enums, users table | 2024-03-18 |
| 1716000000000-AddPushNotifications | push permission status + push_devices registry | 2026-05-13 |
| 1717000000000-CreateDirectMessages | direct_messages table + idx_dm_conversation functional index | 2026-05-16 |
| 1717100000000-AddDmInboxSupport | dm_requests, dm_conversation_state, dm_permission_exceptions | 2026-05-17 |
| 1717500000000-AddGroupSendPermissions | message_permission_enum + groups.send_text_perm/send_media_perm | 2026-06-12 |
