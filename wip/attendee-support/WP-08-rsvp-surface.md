# WP-08 — RSVP surface: endpoint + web control

**task_id:** WP-08
**status:** queued
**owner:** Implementer (backend + web)
**depends on:** WP-03, WP-07 (WP-04 for form conventions)
**next owner after done:** WP-09 unblocks (with WP-04, WP-06)

## Why

With sync executing rsvp commands, the user needs a way to send them: a
backend endpoint translating the browser input into the sync command,
and a Going / Maybe / Decline control on events the user is invited to,
with the approved per-occurrence choice ("this event" / "all events")
for recurring events.

Key files:

- Backend:
  [`packages/backend/src/event/event.routes.config.ts`](../../packages/backend/src/event/event.routes.config.ts),
  [`packages/backend/src/event/controllers/event.controller.ts`](../../packages/backend/src/event/controllers/event.controller.ts),
  [`packages/backend/src/common/services/sync-service/event-command.translation.ts`](../../packages/backend/src/common/services/sync-service/event-command.translation.ts)
  (occurrence-id decode helpers already live here)
- Web:
  [`packages/web/src/views/Forms/EventForm/EventDetailsSection.tsx`](../../packages/web/src/views/Forms/EventForm/EventDetailsSection.tsx),
  [`packages/web/src/views/Forms/EventForm/RecurrenceScopeDialog.tsx`](../../packages/web/src/views/Forms/EventForm/RecurrenceScopeDialog.tsx)
  (scope-choice pattern),
  [`packages/web/src/events/mutations/useEventMutations.ts`](../../packages/web/src/events/mutations/useEventMutations.ts),
  [`packages/web/src/events/event.api.ts`](../../packages/web/src/events/event.api.ts)

## Finish line

1. `POST /api/events/:id/rsvp` accepts `RsvpEventInputSchema`
   (responseStatus + scope), resolves occurrence targets via the
   existing decode, submits the rsvp sync command, and returns the
   updated event; idempotency key derived from
   event + status + scope.
2. An invited event (user's calendar account email in attendees, any
   status) shows a Going / Maybe / Decline segmented control with the
   current status selected — in the event form and consistent with
   `EventDetailsSection` styling.
3. On a recurring event, choosing a response opens the scope choice
   ("this event" / "all events") using the RecurrenceScopeDialog
   pattern; single events skip the dialog.
4. Optimistic: the user's status dot updates immediately, rolls back on
   failure; other attendees' RSVP changes arriving via SSE update the
   list live (regression test only — the path exists).
5. Events where the user is not an attendee show no control. RSVP is
   allowed on viewer-access (read-only) calendars — it is not a
   calendar write.
6. `bun test:backend`, `test:web`, `test:a11y`, `type-check`, `lint`,
   `knip` green.

## Steps

1. Read the key files and WP-07's command semantics.
2. Backend: route + controller (auth/billing parity with event writes,
   but skip the writable-calendar gate — see finish line 5), translate
   scope + occurrence id into the sync command target, reuse
   `submitCommandOrThrow`.
3. Web: `EventApi.rsvpEvent`, mutation with optimistic status update
   (`useEventMutations` patterns), `RsvpControl` component gated on
   self-in-attendees (compare against the calendar's account email),
   scope dialog for recurring.
4. RTL + MSW tests; controller `.test.ts`/`.db.test.ts`; a11y sweep of
   the segmented control.
5. Run the finish-line checks.

## Acceptance tests

- **Normal:** needsAction → Accept on a single event; Decline "this
  event" on a recurring event posts the occurrence id.
- **Incomplete input:** event with attendees but no self match →
  control hidden; invalid status → 400.
- **Tool failure:** POST 503 → optimistic status rolls back via the
  existing error surface.
- **Policy:** RSVP works on a viewer-access calendar; organizer can
  RSVP on their own event.

## Evidence

```text
commands run:
test:backend / test:web / test:a11y result:
occurrence-scope payload proof:
type-check / lint / knip result:
deltas from spec (if any):
```

## Out of scope

- Notifying the user of *incoming* invitations (inbox/badge UX) — the
  event simply appears via sync
- Propose-new-time, RSVP comments/notes

## Risks

- Self-identification uses the calendar's account email (alias wart —
  named in WP-09 docs); don't invent a second matching mechanism.
- The scope dialog must not fire for single events; snapshot the
  no-dialog path.

## Handoff

```yaml
task_id: WP-08
from:
to: Implementer (backend + web)
status:
artifact:
evidence:
assumptions:
open_risks:
next_deadline:
```

## Session prompt

```text
You are implementing WP-08 from
wip/attendee-support/WP-08-rsvp-surface.md in the Compass repo, on
branch claude/attendee-support-planning-nljgeg. Read
wip/attendee-support/README.md, TRACKING.md, and
00-context-and-invariants.md first, mark WP-08 running (owner +
started_at), push the ledger update, and do not start other WPs. WP-03
and WP-07 must be done.

Finish line: POST /api/events/:id/rsvp (status + scope, occurrence
targeting, idempotent); Going/Maybe/Decline control on invited events
with per-occurrence scope dialog for recurring; optimistic update +
rollback; allowed on viewer-access calendars; hidden when self not an
attendee; test:backend + test:web + test:a11y + type-check + lint +
knip green. Fill Evidence, update TRACKING.md, commit conventionally,
push.
```
