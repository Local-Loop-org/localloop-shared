# Mobile Handoff: App-Level Chat Socket Manager

## Summary

This mobile job should be done by a separate focused mobile agent/session after
the backend realtime-module cleanup is planned or underway. It is a medium-size
mobile refactor and should ship as its own PR.

Goal: replace screen/hook-owned Socket.IO connections with one authenticated
`/chat` socket per logged-in app session. Existing hooks should register
subscriptions with a central manager instead of calling `createChatSocket`
directly.

Recommended branch: `refactor/chat-socket-manager`.

## Current State

Multiple hooks currently create their own `/chat` socket:

- `useGroupChat(groupId)`
- `useGroupListRealtime({ presenceGroupIds, summaryGroupIds })`
- `useDmChat(peerId)`
- `useDmPresence(peerId)`
- `useDmInboxRealtime(...)`

This creates connection churn during navigation. `DmChatScreen` is especially
costly because it currently mounts both `useDmChat(peerId)` and
`useDmPresence(peerId)`, which opens two authenticated `/chat` sockets.

## Target Architecture

- `App.tsx` wraps the app in a `ChatSocketProvider` under `QueryClientProvider`.
- The provider reads `accessToken` from `useAuthStore`.
- When an access token exists, the provider creates exactly one Socket.IO client
  using the existing `createChatSocket(accessToken)` factory.
- When the token changes or becomes null, the provider disconnects the old
  socket and clears active subscriptions/listeners.
- Feature hooks use a socket manager context instead of creating sockets.
- Subscriptions are ref-counted so duplicate requests do not duplicate
  subscribe/unsubscribe emits.
- On reconnect, the manager replays all active subscriptions.
- Existing React Query cache writes stay in the feature hooks. The manager owns
  connection lifecycle and event demux, not server-state caching.

## Manager API

Create a provider/context under `src/infra/socket/` or
`src/application/providers/`. Keep `src/infra/socket/chat-socket.ts` as the raw
factory.

Recommended hook:

```ts
export function useChatSocketManager(): ChatSocketManager;
```

Recommended manager shape:

```ts
interface ChatSocketManager {
  connected: boolean;
  emit: (event: ChatSocketEvent, payload: unknown) => void;
  emitWithAck: (
    event: ChatSocketEvent,
    payload: unknown,
    timeoutMs: number,
    callback: (error: Error | null, payload?: unknown) => void,
  ) => void;
  addListener: <T>(
    event: ChatSocketEvent,
    handler: (payload: T) => void,
  ) => () => void;
  subscribe: (subscription: ChatSocketSubscription) => () => void;
}

interface ChatSocketSubscription {
  key: string;
  subscribe: () => void;
  unsubscribe: () => void;
}
```

`subscribe(...)` must:

- Increment a count for `subscription.key`.
- Call `subscription.subscribe()` only when count changes from 0 -> 1 and a
  socket exists.
- Return a cleanup function.
- On cleanup, decrement the count and call `subscription.unsubscribe()` only
  when count changes from 1 -> 0.
- Replay every active subscription after a reconnect.

The `emitWithAck` method is required because `useGroupChat` currently uses
`socket.timeout(...).emit(...)` for `mark_group_read`.

## Migration Steps

### 1. Add Provider

Update `App.tsx`:

```tsx
<QueryClientProvider client={queryClient}>
  <ChatSocketProvider>
    <SafeAreaProvider>
      <StatusBar style="light" />
      <RootNavigator />
    </SafeAreaProvider>
  </ChatSocketProvider>
</QueryClientProvider>
```

The provider should be safe when no user is authenticated: no socket is created,
`connected` is false, and emits/subscriptions no-op.

### 2. Migrate Event Listeners First

Replace direct `socket.on(...)` / `socket.removeAllListeners()` usage in hooks
with `manager.addListener(...)`.

Each hook should remove only the listeners it registered, not all socket
listeners.

### 3. Migrate Subscriptions

Use stable subscription keys:

- `group:join:${groupId}` -> `join_group` / `leave_group`
- `group:presence:${groupId}` -> `watch_presence` / `unwatch_presence`
- `group:summary:${groupId}` -> `watch_group_summaries` /
  `unwatch_group_summaries`
- `dm:join:${peerId}` -> `join_dm` / `leave_dm`
- `dm:presence:${peerId}` -> `watch_dm_presence` / `unwatch_dm_presence`
- `dm:inbox` -> `watch_dm_inbox` / `unwatch_dm_inbox`

For list hooks that watch many group IDs, normalize/dedupe/sort IDs as they do
today. It is acceptable in the first version to register one subscription per
group ID. If batching is kept, the key must include the normalized joined IDs
and cleanup must unwatch the exact same list.

### 4. Migrate Sends And Read Marks

Replace direct socket emits:

- `send_message`
- `send_dm`
- `mark_group_read`
- `mark_dm_read`

Use `emitWithAck` for `mark_group_read`; plain `emit` is enough for the others
unless the hook already expects an ack.

### 5. Remove Direct Socket Creation From Feature Hooks

After migration, these hooks must no longer import `createChatSocket`:

- `useGroupChat`
- `useGroupListRealtime`
- `useDmChat`
- `useDmPresence`
- `useDmInboxRealtime`

`createChatSocket` should be imported only by the provider/factory tests.

## Behavior Requirements

- Opening `DmChatScreen` creates no additional sockets beyond the app-level
  socket, even though it uses both DM chat and DM presence.
- Navigating between Home, My Groups, Inbox, GroupChat, and DmChat should not
  create new sockets while the auth token is unchanged.
- Presence semantics become clearer: "online" means the authenticated app has an
  active `/chat` socket, not that a specific screen is mounted.
- Ref-count cleanup must prevent one screen from unsubscribing another screen's
  active watch.
- Reconnect must restore active rooms/watchers without requiring screen remount.
- React Query cache behavior remains unchanged.
- Push notification active-conversation and dismissal logic remains unchanged.

## Tests

Add provider/manager tests:

- Creates one socket for one token.
- Does not create a socket without a token.
- Disconnects and clears subscriptions when token becomes null.
- Does not create a second socket when multiple hooks subscribe.
- Ref-counts duplicate subscriptions.
- Replays active subscriptions on reconnect.
- Removes only the listener returned by `addListener`.

Update focused hook tests:

- `useGroupChat`
- `useGroupListRealtime`
- `useDmChat`
- `useDmPresence`
- `useDmInboxRealtime`
- `DmChatScreen` should still pass peer presence to layout.

Run at minimum:

```bash
npx tsc --noEmit
npm test -- useGroupChat useGroupListRealtime useDmChat useDmPresence useDmInboxRealtime DmChatScreen --runInBand
```

If time allows, run full mobile Jest with the existing force-exit pattern:

```bash
npm test -- --runInBand --forceExit
```

## Non-Goals

- Do not change API Socket.IO event names or payload shapes.
- Do not migrate REST server state out of React Query.
- Do not add Zustand server-state caches.
- Do not change push-notification routing behavior.
- Do not implement B5/B6 DM read-state UI in this refactor.
