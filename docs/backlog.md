# Long-tail backlog

> Lower-priority work that won't be picked up in the next few sessions.
> Lives here so `status.md` only carries the in-flight work. Promote items
> back to `status.md` when they become near-term.

---

## Phase 5 — Polish

- [ ] **HOME-8** Search polish: build the group-search screen and restore the Home search action; until then, remove/hide the current no-op search button on the next mobile branch that touches Home.
- [ ] Mobile polish: use the shared members icon instead of the literal `MEM` shorthand wherever the UI refers to group members.
- [ ] Moderation: soft-delete messages, ban flow
- [ ] LGPD: `DELETE /users/me` (account deletion, data erasure)
- [ ] Load testing on WebSocket gateway
- [ ] Fix: make `anchorLabel` optional on group creation — API allows null/empty; `CreateGroupScreen` removes the required-field validation on the anchor name input; existing groups with null label render the `AnchorType` display string as fallback everywhere a label is shown.
- [ ] Large-list pagination polish: `GroupMembersScreen` and `MyGroupsScreen` currently operate on the first loaded page / 50-row view. Add infinite pagination and cross-page search/count behavior when real product usage shows groups or memberships regularly exceed that size.
- [ ] Push notification avatar rendering: Android strict top-left large-icon is blocked by the current Expo push payload (`richContent.image` is big-picture, not `largeIcon`), and iOS avatar attachments require a Notification Service Extension. Do not start until native/dev-build or FCM customization is approved.

### Security improvements

- [ ] Chat write rate limiting: add shared HTTP + WebSocket throttling for message sends and edits. Prefer a Redis-backed limiter with per-user and per-conversation buckets (`group:<id>` / sorted `dm:<userA>:<userB>`) plus a tighter same-message edit cooldown. HTTP writes should return `429`; WS writes should emit `ChatSocketEvents.ERROR` with a rate-limit code. Protects DB writes, Redis/pubsub traffic, realtime room fan-out, push/digest side effects, and user-facing spam from authenticated abuse.

### DM-specific polish

- [ ] Block / unblock peer
- [ ] Report user
- [ ] Edit / delete own DM
- [ ] Media in DMs (depends on Phase 3 Slice 2 media upload)
- [ ] Empty-state copy when the user has zero conversations and zero requests

> Full E2E suite on CI is tracked separately under [testing-backlog.md](./testing-backlog.md).

---

## Future — DevOps / Infrastructure (low priority, learning track)

- [ ] Terraform: define all infrastructure as code (Render, Neon, GitHub secrets)
- [ ] Multiple environments (staging + production)
- [ ] iOS builds: set up Apple Developer account + EAS credentials for iOS CI
