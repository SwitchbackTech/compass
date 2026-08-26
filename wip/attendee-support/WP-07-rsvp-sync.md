# WP-07 — RSVP write path in sync

**task_id:** WP-07
**status:** done
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

Recorded 2026-08-26 (implementer: manager-loop session):

```text
commands run: bun test:sync (full, in-memory Mongo harness); bun run
  type-check; bun lint (after bun lint:fix for formatting of new tests);
  bun knip. All re-run on the final tree.
test:sync result: 1072 pass, 0 fail (81 files) — includes the new/extended
  suites: provider-command.service.db.test.ts "executeProviderRsvp" (13
  tests: self-entry rewrite with case-insensitive match, replay without a
  second write, organizer self-RSVP allowed, stored-list guard pre-fetch,
  unresolvable-connection and no-account-email fail-closed, fetched-list
  guard post-fetch, transient-fetch pending, nothing-live permanent
  failure, instance-vs-master targeting pair, cancelled-occurrence
  non-resurrection, scope-this replay), cloud-command.service.db.test.ts
  "rsvp routing" (provider dispatch end-to-end, cloud-only typed refusal
  documented, thisAndFollowing typed refusal, missing-event
  versionConflict), command.routes.db.test.ts (end-to-end confirmed rsvp
  through the signed route with invalidation-outbox rows asserted;
  route-level 400 for responseStatus "needsAction"),
  stale-command-retry.service.db.test.ts (a transiently-failed rsvp is
  swept and confirmed — "rsvp" added to RETRYABLE_KINDS).
safety-canary tests pass: yes — safety-canary.ts untouched; full suite green
  within test:sync and packages/sync/src/safety/ re-run standalone under the
  harness (19 pass, 0 fail). New canary assertions: a failed rsvp's outcome
  and the command route's log-line template contain no attendee JSON
  (findSafetyCanaryHit null), both executor-side (stored-list guard) and
  dispatch-side (cloud-only refusal).
instance-vs-master targeting proof:
  - "patches the resolved Google instance on a scope-this rsvp, leaving the
    master untouched": fetchInstanceCalls[0] = {seriesProviderEventId:
    "g-evt-1", originalStartAt: 2026-07-21T15:00:00.000Z, scheduleKind:
    timed} (the writer's own resolution — no hand-built instance id
    anywhere in the executor; the id used is the one fetchInstanceAt
    returned), fetchEventCalls 0, exactly one patch and its providerEventId
    is "g-inst-1" (never "g-evt-1") with recurrence {kind: "instance"};
    the master's stored guest list and providerVersion are unchanged, the
    answer lands on the exception record carrying the instance identity,
    and the master still projects 07-14 + 07-28 (sibling occurrences
    untouched) with the exception projecting 07-21.
  - "patches the series master on a scope-all rsvp, never resolving an
    instance": fetchInstanceCalls 0, fetchEventCalls 1, the one patch
    targets "g-evt-1" and re-writes the master's own rules unchanged.
type-check / lint / knip result: all exit 0. lint: 0 errors, 10 pre-existing
  warnings (untouched files). knip: no findings (pre-existing .css
  configuration hint only).
deltas from spec (if any):
  - The rsvp patch is UNCONDITIONAL (expectedVersion null), not conditioned
    on the command's expectedVersion: any other guest's concurrent RSVP
    bumps the etag, and RSVP drift must never block an RSVP (invariant 3's
    spirit). The fetch→patch window is the pack's named clobber-window wart.
  - The write port requires a full body, so the patch echoes the freshly
    fetched content/schedule back (self-describing, mirroring how
    "preserve" re-writes current rules) with color/colorHex STRIPPED — a
    slot color in the body would trigger the writer's label-clearing
    pre-patch and could touch Google color state an RSVP must not.
  - Guard order: the self-attendee guard checks the STORED list before any
    provider call (the only pre-fetch source of truth), and re-checks the
    FETCHED list after the fetch (uninvited provider-side since the last
    pull) — both fail the same typed unsupportedCapability. Unverifiable
    connections (missing row / no account email) fail closed pre-fetch,
    reusing WP-02's ProviderConnectionLookup dep.
  - Scope "thisAndFollowing" rsvp (representable in the sync contract,
    unreachable from the browser whose scope enum is single|all) fails
    typed unsupportedCapability at dispatch. A scope-"this" rsvp on a
    NON-recurring event answers the event itself, mirroring how update
    ignores scope on single events.
  - A per-occurrence rsvp commits locally through upsertException with the
    instance's own provider identity + fetched instance content (rewritten
    self entry), then reprojectMaster + exception projection — the exact
    commitProviderOccurrenceUpdate shape — because occurrence rows carry
    only title/schedule and attendee-bearing reads flow from event records;
    the whole-event commit rewrites ONLY content.attendees on the stored
    record and reprojects via reprojectMaster so cancelled tombstones stay
    excluded (regression-tested).
  - SSE: no rsvp-specific plumbing was needed — the command route already
    appends invalidation-outbox notices (command + event kinds) for any
    submission that durably changed state; the end-to-end route test pins
    that a confirmed rsvp produces both rows.
  - "rsvp" added to the stale-command sweep's RETRYABLE_KINDS so a
    transient provider blip mid-execute self-heals like update/delete
    (tested).
  - Environment note (same as WP-02): this container's kernel has IPv6
    disabled and Bun's host-less listen() binds "::", so mongodb-memory-
    server could not boot. Validation ran with a TEMPORARY, uncommitted
    bunfig.toml preload shim forcing IPv4 binds (scratchpad-only; reverted
    before commit). Bun 1.3.11 vs pinned 1.3.14 (harness warns; behavior
    identical here).
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
