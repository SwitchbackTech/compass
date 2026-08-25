# WP-07 — RSVP write path in sync

**task_id:** WP-07
**status:** queued
**owner:** Implementer (sync)
**depends on:** WP-01, WP-02 (shares merge helpers and writer surface)
**next owner after done:** WP-08 unblocks (with WP-03)

## Why

An RSVP is not a content edit: it rewrites exactly one attendee entry —
the user's own — and must not fight `mergeUpdateContent` or
`matchesIntendedEdit`. WP-01 added the `rsvp` command kind; this WP
executes it, including per-occurrence targeting (product decision:
"this event" RSVPs are in scope for v1).

Key files:

- [`packages/sync/src/domain/cloud-command.service.ts`](../../packages/sync/src/domain/cloud-command.service.ts)
- [`packages/sync/src/domain/provider-command.service.ts`](../../packages/sync/src/domain/provider-command.service.ts)
- [`packages/sync/src/providers/google/google-event-writer.adapter.ts`](../../packages/sync/src/providers/google/google-event-writer.adapter.ts)
  (reuse patch + `fetchInstanceAt`/instances surface)
- [`packages/sync/src/providers/google/google-instance-id.ts`](../../packages/sync/src/providers/google/google-instance-id.ts)
  (occurrence-id mechanics)

## Finish line

1. An rsvp command against a provider-linked event where the
   connection's account email appears as an attendee patches only that
   entry's `responseStatus`; the fake `GoogleEventsApi` asserts every
   other entry is byte-identical to the fetched state and
   `sendUpdates: "none"`.
2. Per-occurrence: an rsvp targeting an occurrence id
   (`eventId::recurrenceId`) patches the Google instance event (the
   instance id from the existing decode), leaving the series master
   untouched; a series-scoped rsvp patches the master.
3. Replay-safe: a retry after a landed patch confirms without a second
   write (current self status equals intended).
4. Self not an attendee, or event unlinked/local → typed
   `unsupportedCapability` failure, no provider call. RSVP by the
   organizer on their own event is allowed (organizer self-status).
5. A confirmed rsvp updates sync's stored record (and reprojects
   occurrences if attendee-bearing reads flow from them) so the next
   backend read reflects it before Google round-trips.
6. `bun test:sync` incl. safety-canary green; `type-check`, `lint`,
   `knip` green.

## Steps

1. Read the key files, WP-02's merge helpers, and the occurrence-id
   decode used by update/delete commands.
2. Implement rsvp execution in `provider-command.service.ts`: resolve
   target (master vs instance), fetch current, match self by
   case-insensitive email, rewrite status, patch full list. Reuse
   WP-02's attendee body emission.
3. Replay branch: before writing, if the fetched self entry already
   holds the intended status, confirm without a write.
4. `cloud-command.service.ts`: cloud-only events with attendees are not
   expected in v1; a rsvp against one fails typed (document in test).
5. Persist on confirm: update stored attendees; trigger the same
   post-write bookkeeping update commands use (invalidations outbox →
   SSE `eventsChanged`).
6. Tests: self-match (incl. case difference), instance vs master
   targeting, replay, guards, canary.
7. Run the finish-line checks.

## Acceptance tests

- **Normal:** accepted → declined patch on a single event; declined on
  one occurrence leaves the master and sibling occurrences untouched.
- **Incomplete input:** rsvp to `needsAction` is unrepresentable
  (rejected at WP-01 contract — assert route-level 400).
- **Tool failure:** fetch 5xx → command stays pending/retryable.
- **Policy:** self not in attendee list → `unsupportedCapability`, no
  provider call; attendee JSON absent from all logs (canary).

## Evidence

```text
commands run:
test:sync result:
safety-canary suite: pass/fail
instance-vs-master targeting proof:
type-check / lint / knip result:
deltas from spec (if any):
```

## Out of scope

- Backend endpoint and web UI (WP-08)
- Google's `self`/`optional` attendee flags in the normalizer (alias
  matching is a named wart)
- Propose-new-time, comments

## Risks

- Google instance patching: the instance id format must come from the
  existing decode helpers, never hand-built.
- Patching the full list to change one entry inherits WP-02's
  clobber-window wart — acceptable, documented.

## Handoff

```yaml
task_id: WP-07
from:
to: Implementer (sync)
status:
artifact:
evidence:
assumptions:
open_risks:
next_deadline:
```

## Session prompt

```text
You are implementing WP-07 from
wip/attendee-support/WP-07-rsvp-sync.md in the Compass repo, on branch
claude/attendee-support-planning-nljgeg. Read
wip/attendee-support/README.md, TRACKING.md, and
00-context-and-invariants.md first, mark WP-07 running (owner +
started_at), push the ledger update, and do not start other WPs. WP-01
and WP-02 must be done.

Finish line: rsvp command execution — fetch current, rewrite only the
self entry (case-insensitive account-email match), patch with
sendUpdates none; per-occurrence targets the Google instance, series
targets the master; replay confirms without rewrite; typed
unsupportedCapability guards; stored record updated on confirm with SSE
invalidation; test:sync + safety-canary + type-check + lint + knip
green. Fill Evidence, update TRACKING.md, commit conventionally, push.
```
