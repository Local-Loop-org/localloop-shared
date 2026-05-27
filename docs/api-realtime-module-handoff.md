# API Handoff: RealtimeModule and TD-13 Cleanup

## Summary

Status: **implemented** on API branch `refactor/realtime-module` / PR #25.

The backend refactor was completed as one focused API slice, separate from the
mobile socket-manager work. The public Socket.IO protocol stayed unchanged:
namespace `/chat`, `ChatSocketEvents.*`, room names, and payload shapes are
compatible with the existing mobile app.

Implementation landed in three API commits:

- `refactor(realtime): break chat module cycle`
- `refactor(realtime): extract chat gateway services`
- `fix(realtime): consume dm presence shared types`

## Current State

- `MessagesModule` owns only group-message HTTP/use-case/repository concerns.
- `DirectMessagesModule` owns only DM HTTP/use-case/repository concerns.
- `RealtimeModule` owns `ChatGateway` and Socket.IO `/chat` wiring.
- `RealtimeEventsModule` owns an in-process typed event bus used by
  HTTP controllers to request realtime side effects without importing the
  gateway.
- `AppModule` imports `MessagesModule`, `DirectMessagesModule`, and
  `RealtimeModule`.
- No `forwardRef` remains between `MessagesModule` and `DirectMessagesModule`.
- `@localloop/shared-types@^2.5.0` is required by the API so DM presence events
  are present during clean CI installs.

Module dependencies:

```text
MessagesModule          -> AuthModule, GroupsModule, TypeOrmModule
DirectMessagesModule    -> AuthModule, GroupsModule, RealtimeEventsModule, TypeOrmModule
RealtimeModule          -> AuthModule, GroupsModule, NotificationsModule,
                           MessagesModule, DirectMessagesModule,
                           RealtimeEventsModule
RealtimeEventsModule    -> no feature modules
```

## Realtime Services

`ChatGateway` is now mostly Socket.IO routing glue:

- socket auth middleware
- `@SubscribeMessage(...)` methods
- minimal payload validation
- connection/disconnection lifecycle hooks
- delegation to focused services

Focused services:

- `GroupPresenceRealtimeService`
- `GroupSummaryRealtimeService`
- `GroupMessageRealtimeService`
- `DmPresenceRealtimeService`
- `DmInboxRealtimeService`
- `DmMessageRealtimeService`

HTTP-triggered DM realtime effects flow through
`RealtimeEventsService` -> `DirectMessageRealtimeEventHandler` -> `ChatGateway`.
Current event types are `dm_request_accepted`, `dm_summary_requested`, and
`dm_read`.

## Historical Implementation Steps

Retained for audit only. These steps are complete on
`refactor/realtime-module`; future realtime work should follow the Current
State / Realtime Services sections above.

### 1. Create A Neutral Realtime Event Bus

Add a small module such as `src/modules/realtime-events/`.

Recommended public API:

```ts
export type RealtimeEvent =
  | {
      type: 'dm_request_accepted';
      senderId: string;
      payload: DirectMessagePayload;
    }
  | {
      type: 'dm_summary_requested';
      userId: string;
      peerId: string;
    }
  | {
      type: 'dm_read';
      readerId: string;
      peerId: string;
      lastReadAt: Date;
    };

export class RealtimeEventsService {
  emit(event: RealtimeEvent): void;
  on(handler: (event: RealtimeEvent) => void | Promise<void>): () => void;
}
```

Use Node's `EventEmitter` or a tiny local subscriber list. Do not add an npm
dependency for this.

### 2. Remove Direct Gateway Injection From DM HTTP

Update `DirectMessagesController`:

- Inject `RealtimeEventsService` instead of `ChatGateway`.
- After `acceptDmRequest.execute(...)`, emit:
  - `dm_request_accepted`
  - `dm_summary_requested` for sender -> recipient
  - `dm_summary_requested` for recipient -> sender
- After archive/unarchive, emit `dm_summary_requested` for caller -> peer.
- After REST mark-read, emit `dm_read`.

Keep all existing HTTP response bodies/status codes unchanged.

Update `DirectMessagesModule`:

- Remove `forwardRef(() => MessagesModule)`.
- Import `RealtimeEventsModule`.

Update controller tests:

- Replace `ChatGateway` mocks with `RealtimeEventsService` mocks.
- Assert the same logical realtime side effects are requested via events.

### 3. Move ChatGateway To RealtimeModule

Create `src/modules/realtime/realtime.module.ts`.

Move:

- `src/modules/messages/presentation/chat.gateway.ts`
  -> `src/modules/realtime/presentation/chat.gateway.ts`
- `src/modules/messages/presentation/chat.gateway.spec.ts`
  -> `src/modules/realtime/presentation/chat.gateway.spec.ts`

Update imports in specs and any referenced paths.

Update `MessagesModule`:

- Remove `forwardRef(() => DirectMessagesModule)`.
- Remove `ChatGateway` from providers and exports.
- Export `SendMessageUseCase` so `RealtimeModule` can inject it.

Verify `DirectMessagesModule` already exports the DM use cases and
`DIRECT_MESSAGE_REPOSITORY` needed by the gateway. Add missing exports only if
the compiler requires them.

Update `AppModule`:

- Import `RealtimeModule`.

### 4. Subscribe RealtimeModule To HTTP Events

Add a provider in `RealtimeModule`, for example
`DirectMessageRealtimeEventHandler`.

It should inject:

- `RealtimeEventsService`
- `ChatGateway`

On module init, subscribe to events and call the existing gateway public methods:

- `dm_request_accepted` -> `chatGateway.emitDmRequestAccepted(...)`
- `dm_summary_requested` -> `chatGateway.emitDmSummary(...)`
- `dm_read` -> `chatGateway.emitDmReadSideEffects(...)`

On module destroy, unsubscribe.

This keeps behavior stable while breaking the module cycle. Later extraction can
move those public methods from the gateway into a service.

### 5. Extract Gateway Logic Behind Services

After the cycle is removed and tests pass, split the biggest logic groups out of
`ChatGateway`. Do not change wire contracts.

Recommended first services:

- `GroupPresenceRealtimeService`
  - `watchPresence`
  - `unwatchPresence`
  - `emitPresence`
  - group presence authorization
- `GroupSummaryRealtimeService`
  - `watchGroupSummaries`
  - `unwatchGroupSummaries`
  - `emitGroupSummary`
  - mark-group-read ack summary serialization
- `DmPresenceRealtimeService`
  - `watchDmPresence`
  - `unwatchDmPresence`
  - `emitDmPresenceForUser`
  - DM presence authorization
- `DmInboxRealtimeService`
  - `watchDmInbox`
  - `unwatchDmInbox`
  - `emitDmSummary`
  - request-accepted event fan-out
- `DmMessageRealtimeService`
  - `joinDm`
  - `leaveDm`
  - `sendDm`
  - `markDmRead`
- `GroupMessageRealtimeService`
  - `joinGroup`
  - `leaveGroup`
  - `sendMessage`

Keep `ChatGateway` responsible for:

- Socket auth middleware
- `@SubscribeMessage(...)` methods
- minimal payload validation
- delegating to services
- connection/disconnection lifecycle hooks

Do not split into a `/dm` namespace in this task.

## Implemented Criteria

- `MessagesModule` has no dependency on `DirectMessagesModule`.
- `DirectMessagesModule` has no dependency on `MessagesModule`.
- No `forwardRef` remains between those modules.
- `ChatGateway` is provided by `RealtimeModule`, not `MessagesModule`.
- Existing mobile app does not need protocol changes.
- REST DM accept/archive/unarchive/mark-read still trigger the same realtime
  updates as before.
- Group chat, group presence, group summaries, DM chat, DM inbox, DM read
  receipts, DM presence, and push digest cleanup keep their behavior.

## Validation

The implementation branch was validated with:

```bash
npm test -- chat.gateway --runInBand
npm test -- direct-messages.controller --runInBand
npm run build
```

Full API Jest also passed on the implementation branch:

```bash
npm test -- --runInBand
```

## Non-Goals

- Do not rename `messages` to `group-messages` in this PR.
- Do not change Socket.IO event names, payload shapes, or room names.
- Do not add database migrations.
- Do not introduce a new external event bus dependency.
- Do not address TD-12 message-use-case consolidation here.
