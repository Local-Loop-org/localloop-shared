# API Handoff: RealtimeModule and TD-13 Cleanup

## Summary

This backend job should be done by one focused API agent/session, separate from
the mobile socket-manager job. It is large enough to deserve its own PR, but it
does not need to be split further if the agent keeps the protocol unchanged and
works in two commits:

1. Break the `MessagesModule` <-> `DirectMessagesModule` cycle by moving
   `ChatGateway` to a new realtime owner and replacing HTTP-controller gateway
   calls with a neutral realtime event bus.
2. Extract gateway internals into focused realtime services until
   `ChatGateway` is mostly Socket.IO routing glue.

Recommended branch: `refactor/realtime-module`.

## Current State

- `MessagesModule` is effectively group messages, but it also owns
  `ChatGateway`.
- `ChatGateway` handles group chat, group presence, group summaries, DM send,
  DM inbox, DM read receipts, DM presence, push digest cleanup, and push fan-out.
- `MessagesModule` imports `forwardRef(() => DirectMessagesModule)` because
  `ChatGateway` injects DM use cases/repositories.
- `DirectMessagesModule` imports `forwardRef(() => MessagesModule)` because
  `DirectMessagesController` injects `ChatGateway` for HTTP-triggered realtime
  effects:
  - request accepted fan-out
  - DM summary fan-out after accept/archive/unarchive
  - read receipt + summary + push digest cleanup after REST mark-read
- This is TD-13. `forwardRef` only hides the boot-order issue; it does not fix
  the architecture.

## Target Architecture

- Keep the public Socket.IO namespace and shared event names unchanged:
  `/chat`, `ChatSocketEvents.*`, room names, and payload shapes must remain
  compatible with the current mobile app.
- `MessagesModule` owns only group-message HTTP/use-case/repository concerns.
- `DirectMessagesModule` owns only DM HTTP/use-case/repository concerns.
- New `RealtimeModule` owns `ChatGateway` and Socket.IO `/chat` wiring.
- New neutral `RealtimeEventsModule` owns an in-process typed event bus used by
  HTTP controllers to request realtime side effects without importing the
  gateway.
- `AppModule` imports `MessagesModule`, `DirectMessagesModule`, and
  `RealtimeModule`.
- No `forwardRef` remains between `MessagesModule` and `DirectMessagesModule`.

Expected module dependencies:

```text
MessagesModule          -> AuthModule, GroupsModule, TypeOrmModule
DirectMessagesModule    -> AuthModule, GroupsModule, RealtimeEventsModule, TypeOrmModule
RealtimeModule          -> AuthModule, GroupsModule, NotificationsModule,
                           MessagesModule, DirectMessagesModule,
                           RealtimeEventsModule
RealtimeEventsModule    -> no feature modules
```

## Implementation Steps

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

## Acceptance Criteria

- `MessagesModule` has no dependency on `DirectMessagesModule`.
- `DirectMessagesModule` has no dependency on `MessagesModule`.
- No `forwardRef` remains between those modules.
- `ChatGateway` is provided by `RealtimeModule`, not `MessagesModule`.
- Existing mobile app does not need protocol changes.
- REST DM accept/archive/unarchive/mark-read still trigger the same realtime
  updates as before.
- Group chat, group presence, group summaries, DM chat, DM inbox, DM read
  receipts, DM presence, and push digest cleanup keep their behavior.

## Tests

Run at minimum:

```bash
npm test -- chat.gateway --runInBand
npm test -- direct-messages.controller --runInBand
npm run build
```

If time allows, run full API Jest:

```bash
npm test -- --runInBand
```

## Non-Goals

- Do not rename `messages` to `group-messages` in this PR.
- Do not change Socket.IO event names, payload shapes, or room names.
- Do not add database migrations.
- Do not introduce a new external event bus dependency.
- Do not address TD-12 message-use-case consolidation here.
