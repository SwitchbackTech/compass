# WP-03 — Backend write path: stop zeroing, thread invitation

**task_id:** WP-03
**status:** done
**owner:** Implementer (backend)
**depends on:** WP-01 (may run parallel with WP-02 — different packages)
**next owner after done:** WP-04 unblocks (with WP-02); WP-08 partially

## Why

The backend translator is where attendee intent dies today:
`toSyncContent` pads `attendees: []` and three call sites hardcode
`invitation: "none"`. This WP maps the new browser fields (WP-01) onto
the sync command inputs and gates who may send them, without any UI —
the API accepts the fields, but nothing sends them yet (dark launch).

Key files:

- [`packages/backend/src/common/services/sync-service/event-command.translation.ts`](../../packages/backend/src/common/services/sync-service/event-command.translation.ts)
  (`toSyncContent`; `invitation: "none"` at ~lines 145, 190, 253)
- [`packages/backend/src/event/controllers/event.controller.ts`](../../packages/backend/src/event/controllers/event.controller.ts)
- [`packages/backend/src/common/services/sync-service/event-list.translation.ts`](../../packages/backend/src/common/services/sync-service/event-list.translation.ts)
  (read path — verify only, it already flows attendees)

## Finish line

1. A POST/PUT whose content carries `attendees` plus
   `invitation: "all"` produces a `CommandSubmitRequest` with the
   attendees mapped (placeholder `responseStatus: "needsAction"`),
   `attendeesEdit: "replace"`, and `invitation: "all"` — asserted
   against `CommandSubmitRequestSchema`.
2. Requests omitting both fields produce submit requests byte-identical
   to today (snapshot regression), including unchanged idempotency
   keys for identical legacy payloads.
3. `invitation` on DELETE flows through (guest cancellation emails).
4. Attendees on a non-Google or read-only calendar → typed 4xx (new
   error code, e.g. `ATTENDEES_UNSUPPORTED`), no sync submission.
5. `bun test:backend` green; `type-check`, `lint`, `knip` green.

## Steps

1. Read the key files and colocated tests (`.test.ts` and
   `.db.test.ts`).
2. `toSyncContent`: accept optional attendees; present → map with
   `needsAction` placeholder + `attendeesEdit: "replace"`; absent →
   today's `[]` pad + `"preserve"`.
3. Replace the three hardcoded `invitation: "none"` with the input's
   value, defaulting to `"none"` when absent.
4. Verify how the update idempotency key hashes the payload: it must
   hash the content as received so legacy keys stay stable; add a test
   proving a legacy payload's key is unchanged.
5. Controller gating: attendees present → calendar must be
   Google-linked and writable, else the typed 4xx. Reuse the existing
   calendar lookup the controller already performs.
6. Synthesized optimistic response events must carry the intended
   attendees so the browser cache stays coherent.
7. Spot-check `event-list.translation.ts` needs no change.
8. Run the finish-line checks.

## Acceptance tests

- **Normal:** replace with attendees + invitation round-trips into a
  schema-valid submit request.
- **Incomplete input:** attendee email failing the schema →
  `INVALID_INPUT` 400, not a 500.
- **Tool failure:** sync 503 during submit → existing retryable
  `SYNC_UNAVAILABLE` behavior unchanged with the new fields present.
- **Policy:** `invitation` accepted on delete; attendees on a local
  calendar rejected with the new code and no sync call.

## Evidence

Recorded 2026-08-26 (implementer: manager-loop session):

```text
commands run: bun test:backend (full, via test-mongo-env with the
  scratchpad-only IPv4 listen shim — see environment note); bun test:core
  (regression for the new core error code); bun run type-check; bun lint
  (after bun lint:fix for formatting only); bun knip. All re-run on the
  final tree.
test:backend result: 390 pass, 1 skip, 8 fail (50 files). The 8 failures
  (GET /api/config x3, UserController x5) are pre-existing
  sandbox-environment issues: with this WP's work stashed, the base tree
  fails the IDENTICAL 8 tests (374 pass, 8 fail) under the same command —
  this WP adds 16 passing tests and no failures. test:core: 605 pass 0
  fail (36 files).
legacy idempotency-key proof:
  - Before changing any code, the pre-WP translator was executed against
    fixed legacy payloads and its keys captured:
    update:0b7c2048556d01da12ae81970f090b767bc6a6bc (replace) and
    delete:b65cb27825e51d116acdcb198b1f11786dd971c4 (delete). Both
    literals are pinned in event-command.translation.test.ts ("keeps the
    legacy update idempotency key stable across the attendee rollout",
    "threads invitation through a delete without changing its identity
    key") and pass against the post-WP translator — legacy keys are
    byte-stable. The update hash covers the browser content AS RECEIVED,
    so absent attendees/invitation serialize exactly as pre-WP;
    invitation stays outside the hash (like restore — per-submission
    delivery intent, and the UI only offers it when the guest set
    changed, which changes content and therefore the key anyway); a
    guest-list edit rides inside content and mints a distinct key
    (asserted). Full legacy submit-request byte-identity is pinned by
    "builds a byte-identical submit request for a legacy replace
    payload" (toEqual against the complete request literal, including
    invitation "none" + attendeesEdit "preserve" + [] attendee pad).
type-check / lint / knip result: all exit 0. lint: 0 errors, 10
  pre-existing warnings (untouched files). knip: no findings
  (pre-existing .css configuration hint only).
deltas from spec (if any):
  - ATTENDEES_UNSUPPORTED is 403 (FORBIDDEN, retryable false), joining
    the capability-refusal family (CALENDAR_READ_ONLY,
    UNSUPPORTED_OPERATION); code added to core's
    EventMutationErrorCodeSchema since that is where the shared error
    vocabulary lives (backend maps status/retryable in event.error.ts).
  - Replace carries no calendarId (cross-calendar moves are rejected
    pre-submit as MOVE_UNSUPPORTED) and the sync client has no
    event-by-id lookup, so the replace gate degrades to "the principal
    has at least one writable Google calendar" from the same
    listCalendars(activeOnly) lookup the read path uses; create gates
    exactly on the target calendarId. Per-event backstops: the web only
    renders the editor on the event's own writable Google calendar
    (WP-04) and sync's organizer guard (WP-02) refuses per-event misuse.
    The local calendar is never in sync's calendar list, so local-only
    accounts fail the gate by construction.
  - DELETE has no body, so the cancellation-email choice rides the query
    string (?invitation=all|externalOnly|none), validated through
    DeleteEventInputSchema; invalid values are 400 INVALID_INPUT with no
    sync call.
  - Synthesized optimistic response events map intended attendees to the
    read shape with responseStatus "needsAction" (toResponseContent) —
    required, not just nice: the write-input attendee shape has no
    responseStatus and would fail EventSchema.parse otherwise.
  - event-list.translation.ts spot-checked: already flows
    organizer/attendees/conference through toBrowserDetails — no change.
  - Environment note (same as WP-02): this container's kernel has IPv6
    disabled and Bun's host-less listen() binds "::", so
    mongodb-memory-server needs a TEMPORARY scratchpad-only bun
    --preload shim forcing IPv4 binds (never committed). Bun 1.3.11 vs
    pinned 1.3.14 (harness warns; behavior identical here).
```

## Out of scope

- Web UI (WP-04), RSVP endpoint (WP-08), contacts proxy (WP-06)
- Any sync-package change

## Risks

- Idempotency-key drift for legacy payloads would double-apply retried
  commands after deploy — the explicit key-stability test is mandatory.
- Gating must not regress local/anonymous calendar writes that omit
  attendees.

## Handoff

```yaml
task_id: WP-03
from:
to: Implementer (backend)
status:
artifact:
evidence:
assumptions:
open_risks:
next_deadline:
```

## Session prompt

```text
You are implementing WP-03 from
wip/attendee-support/WP-03-backend-write-path.md in the Compass repo, on
branch claude/attendee-support-planning-nljgeg. Read
wip/attendee-support/README.md, TRACKING.md, and
00-context-and-invariants.md first, mark WP-03 running (owner +
started_at), push the ledger update, and do not start other WPs. WP-01
must be done.

Finish line: toSyncContent maps optional attendees →
attendeesEdit replace/preserve; invitation threaded from input at all
three call sites incl. delete; legacy submit requests byte-identical
with stable idempotency keys; attendees gated to writable Google
calendars with a typed 4xx; test:backend + type-check + lint + knip
green. Fill Evidence, update TRACKING.md, commit conventionally, push.
```
