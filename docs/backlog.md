# Long-tail backlog

> Lower-priority work that won't be picked up in the next few sessions.
> Lives here so `status.md` only carries the in-flight work. Promote items
> back to `status.md` when they become near-term.

---

## Phase 5 — Polish

- [ ] **HOME-8** Search polish: build the group-search screen and restore the Home search action; until then, remove/hide the current no-op search button on the next mobile branch that touches Home.
- [ ] Mobile polish: use the shared members icon instead of the literal `MEM` shorthand wherever the UI refers to group members.
- [ ] Moderation: soft-delete messages, ban flow
- [ ] Rate limiting (NestJS ThrottlerModule)
- [ ] LGPD: `DELETE /users/me` (account deletion, data erasure)
- [ ] Load testing on WebSocket gateway
- [ ] Fix: make `anchorLabel` optional on group creation — API allows null/empty; `CreateGroupScreen` removes the required-field validation on the anchor name input; existing groups with null label render the `AnchorType` display string as fallback everywhere a label is shown.

### DM-specific polish

- [ ] Block / unblock peer
- [ ] Report user
- [ ] Edit / delete own DM
- [ ] Media in DMs (depends on Phase 3 Slice 2 media upload)
- [ ] Empty-state copy when the user has zero conversations and zero requests

> Full E2E suite on CI is tracked separately under [testing-backlog.md](./testing-backlog.md).

---

## RQ migration backlog (TD-09) — remaining

Pilot landed in Phase 3 Slice 1 (`useGroupChat`: `useInfiniteQuery` for history + optimistic `sendMessage`). Closed migrations are in [done.md](./done.md). Remaining migrations, each in its own `refactor/rq-<slug>` branch:

**HTTP cache — convert `useState + useEffect` fetch calls to `useQuery`**

- [ ] `GET /users/me` (currently only called inside auth flow) — wrap when a user-profile screen exists.

**Optimistic mutations — convert to `useMutation` with `onMutate` / rollback**

- [ ] `joinGroup` — optimistic `myRole` flip (OPEN → member, APPROVAL_REQUIRED → local pending state)
- [ ] `leaveGroup` — optimistic removal + navigate on success
- [ ] `banMember` — optimistic removal from members list (already done manually — port to mutation)
- [ ] `unbanMember` — optimistic removal from banned list + optional restore path if the API returns the active member shape
- [ ] `resolveJoinRequest` — optimistic removal from pending list + `memberCount` bump on approve (already done manually — port to mutation)
- [ ] `updateUserProfile` (PATCH /users/me) — optimistic update of `useAuthStore` user; rollback on failure

---

## Future — DevOps / Infrastructure (low priority, learning track)

- [ ] Terraform: define all infrastructure as code (Render, Neon, GitHub secrets)
- [ ] Multiple environments (staging + production)
- [ ] iOS builds: set up Apple Developer account + EAS credentials for iOS CI
