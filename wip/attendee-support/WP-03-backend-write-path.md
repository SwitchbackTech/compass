# WP-03 — Backend write path: stop zeroing, thread invitation

**task_id:** WP-03
**status:** queued
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

```text
commands run:
test:backend result:
legacy idempotency-key proof:
type-check / lint / knip result:
deltas from spec (if any):
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
