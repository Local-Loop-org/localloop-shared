# ADR-006: DM request routing — exceptions as a first-class concept

## Status
Accepted

## Date
2026-05-18

## Context

The original Phase 4 design returned `403 DM_NOT_ALLOWED` whenever a recipient's `dm_permission` blocked a sender (`nobody`, or `members` with no shared active group). The PRD captured this as `rejeita com 403`.

Two problems surfaced once the inbox flow was being built:

1. **No user-facing path for "I want to talk to this person who blocks DMs by default."** A blanket 403 means the sender has no way to signal intent and the recipient has no way to discover that someone wanted to reach them. Most messaging products (Instagram DMs, WhatsApp message requests) surface a "Requests" inbox instead of silently dropping the send.
2. **`dm_permission` alone is too coarse for the lifecycle of a real conversation.** A user who set `nobody` last week but has been actively chatting with five people for a year shouldn't have those five threads silently break on the next message. There needs to be a per-peer allow concept.

`dm_permission_exceptions` was already in the schema as a flat allow-list but its semantics were unspecified — and the live code treated it only as a hard bypass populated by accepting a request.

## Decision

**The DM gate is `dm_permission` + `dm_permission_exceptions`.** A send to user B from user A is checked against B's gate; if B's gate allows, the message lands in `direct_messages`; if not, it becomes a pending row in `dm_requests` and the recipient can accept or ignore it.

**`dm_permission` enum values are reinterpreted as the default-deny floor:**

  - `everyone` — anyone can send; exceptions are moot for inbound (but still matter if the user tightens later).
  - `members` — anyone sharing an active group, **plus** anyone on the exception list.
  - `nobody` — "nobody EXCEPT exceptions". Not an absolute block.

**Exceptions are populated three ways:**

  - **Implicit** — on every successful direct delivery from A to B, write `exception(A, B)`. The sender is consenting to the recipient replying.
  - **Explicit** — on acceptance of a pending request, write `exception(recipient, sender)`, materialize the held content into `direct_messages` with the original `created_at`, and delete the `dm_requests` row, all in one transaction.
  - **Manual** — the profile-screen permissions section lets a user add or revoke exceptions directly.

**Revoking an exception only gates future sends.** Existing thread history stays readable; the read endpoint has no policy check. The revoked peer's next message becomes a request.

**HTTP `POST /dm/:userId` response is a discriminated union** — `{ type: 'message', ... }` or `{ type: 'request', requestId }` — so callers can render the right UI without inferring from status codes. `DM_NOT_ALLOWED` no longer exists.

## Consequences

### Positive
- The 403-vs-request distinction is no longer load-bearing; product can iterate on the request UX (inline notifications, banner counts, etc.) without touching the routing layer.
- Active conversations are auto-grandfathered by the implicit-add rule. A user can flip to `nobody` without breaking threads where both sides have actually communicated.
- The exception list becomes a first-class user-managed concept — the profile UI can show "who can DM me" as a concrete list, not as an opaque derivation.
- One-sided / abandoned threads (sender wrote, recipient never replied) lose access on tightening, which is the correct privacy default.
- The request flow gives recipients an explicit affordance to triage incoming attempts without silently dropping intent.

### Negative
- More schema (`dm_requests`, `dm_permission_exceptions`, `dm_conversation_state`) and more code paths. Every send now branches on routing, and every write path now has to consider exception bookkeeping.
- Backfill: the implicit-add rule is forward-only. Threads created before the rule ships will not have exception rows, so tightening `dm_permission` on those legacy users will lose those threads. Documented as accepted; alternative was a one-time migration.
- The exception list can grow unbounded for active users. No size cap is enforced; revisit if it becomes a UX or storage problem.
- Mobile clients have a strictly richer contract to implement (discriminated union response, request inbox, accept flow, manual mgmt UI). Worth it for the UX, but it widens the Phase 4 surface.

### Neutral
- `dm_permission = nobody` no longer means "absolute block". A separate per-peer block primitive (Phase 5 polish) is now needed for the "I never want to hear from this person" affordance.
- Implementation alignment is staged. The spec lives in `architecture.md` → "Direct messages"; the code has 12 enumerated gaps to close before the contract is fully honored.

## Alternatives considered

| Option | Why rejected |
|--------|-------------|
| Keep 403 `DM_NOT_ALLOWED` for blocked sends | Bad UX: sender has no path to escalate intent, recipient has no path to discover the attempt. Product wanted a request inbox. |
| Allow-all-and-mute (every send always lands; recipient mutes peers) | Recipient cannot filter at receive time, only suppress notifications. Spam-prone and doesn't compose with `dm_permission = nobody`. |
| Drop `dm_permission` entirely; only exceptions matter | Removes the "open to anyone" default-allow case. Most users want `everyone` or `members` and don't want to manage an exception list. |
| Mirror Slack-style "DMs are workspace-scoped" | LocalLoop has no workspace concept; the proximity-based group is the closest analog but it's per-group, not per-user. |
| Treat group co-membership as the implicit exception | Considered: writing exception rows on join. Rejected because group membership churns more than DM consent — leaving a group shouldn't revoke DM access. The `members` enum value already covers the "shared group ⇒ allow" case at gate-check time without needing a write. |
