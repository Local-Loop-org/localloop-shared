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
| anchor_geohash | CHAR(6) | NOT NULL | Anchor location (never returned to clients) |
| anchor_label | VARCHAR(100) | NOT NULL | Human-readable location label |
| privacy | group_privacy_enum | NOT NULL, DEFAULT `open` | Join policy |
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

### direct_messages [PLANNED — Phase 5]

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| sender_id | UUID | FK → users.id, NOT NULL | |
| recipient_id | UUID | FK → users.id, NOT NULL | |
| content | TEXT | nullable | |
| media_url | TEXT | nullable | |
| media_type | media_type_enum | nullable | |
| is_deleted | BOOLEAN | NOT NULL, DEFAULT false | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**Indexes:**
- `idx_dm_conversation` on `(LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id), created_at DESC)` — conversation cursor pagination

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

-- anchor_type_enum
'establishment'  -- bar, restaurant, shop (~100m radius)
'neighborhood'   -- bairro (~2km radius)
'condo'          -- condominium (exact address)
'event'          -- temporary event (~500m radius)
'city'           -- entire city

-- group_privacy_enum
'open'              -- user joins immediately
'approval_required' -- creates a group_join_request (pending)

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
