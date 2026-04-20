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
- Proximity labels are generated server-side from geohash prefix comparison.

### Real-time (chat — Phase 3)

- Socket.IO with `@socket.io/redis-adapter` for multi-instance pub-sub.
- Room naming: `group:{groupId}` and `dm:{userId1}:{userId2}` (sorted IDs).

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
