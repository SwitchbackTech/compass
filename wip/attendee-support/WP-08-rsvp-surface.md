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

Recorded 2026-08-26 (implementer: manager-loop session — TAKEOVER: the
prior worker implemented most of this WP then hit a usage limit mid-way
through the EventForm gating tests; its uncommitted tree was reviewed
critically, kept, validated, and shipped — the only fixes needed were
formatter-only, via `bun lint:fix`, on 4 new test files):

```text
commands run: bun test:backend (full, via test-mongo-env with the
  scratchpad-only IPv4 listen shim — same environment note as WP-02/03/07,
  never committed); bun test:web; bun test:core (regression — no core
  contract changes in this WP; RsvpEventInputSchema shipped in WP-01);
  bunx playwright test e2e/accessibility --timeout=180000; bun run
  type-check; bun lint (after bun lint:fix, formatting only); bun knip.
  All re-run on the final tree.
test:backend / test:web / test:a11y result:
  - test:backend: 415 pass, 1 skip, 8 fail (52 files) — the 8 (GET
    /api/config x3, UserController x5) are the IDENTICAL pre-existing
    WP-03/WP-06 baseline (container env); this WP adds 9 new passing
    tests (5 toRsvpSubmitRequest, 4 controller rsvp) and no failures.
  - test:web: 2407 pass, 0 fail (319 files; +19 tests / +3 files over
    WP-06's 2388) — new suites RsvpControl.test.tsx (8: labelled
    radiogroup with current answer checked, unanswered = none checked,
    hidden without self match, single event answers immediately with no
    dialog, occurrence offers This Event / All Events and NEVER
    this-and-following, All Events posts scope all, cancel sends
    nothing, re-choosing the current answer sends nothing),
    EventForm.rsvp.test.tsx (6 gating tests: shown on writable Google,
    shown on viewer-access (reader) calendar while the rest of the form
    stays read-only, shown for the organizer (checked Going), hidden
    when self not an attendee, hidden on local events, hidden with no
    attendees), useEventMutations.rsvp.test.tsx (5, MSW through the
    real EventApi/BaseApi stack: wire bodies below; optimistic
    self-only paint + 503 rollback; series-wide paint of master +
    cached occurrences; settles via invalidation — the same path SSE
    eventsChanged rides, pinned as the finish-line-4 regression test).
  - test:a11y: all 7 pass as `bunx playwright test e2e/accessibility
    --timeout=180000` (axe "incomplete" logged, not failures, per
    docs/development/testing-playbook.md; the default-30s command is
    not claimed green — same container-slowness note as WP-04/06).
    LOUD NOTE: the axe e2e harness runs the anonymous local-mode app,
    where no Google invitation can exist for RsvpControl to mount on,
    so the control itself is NOT axe-swept; its accessibility contract
    is pinned in RsvpControl.test.tsx via RTL role/name semantics
    (aria-labelledby radiogroup "Going?", three named radios with
    checked state, sr-only inputs with peer focus-visible rings —
    the same pattern as the shipped RecurrenceScopeDialog).
occurrence-scope payload proof:
  - Backend (event-command.translation.test.ts "addresses one
    occurrence for scope single on a composite id"): composite id
    `<eventId>::2026-07-21T15:00:00.000Z` + browser input
    {responseStatus: "declined", scope: "single"} translates to
    request.eventId = <eventId> (bare series id), expectedVersion null,
    input {kind: "rsvp", responseStatus: "declined", scope: "this",
    recurrenceId: "2026-07-21T15:00:00.000Z"} — the WP-07 executor's
    per-occurrence target. Scope "all" on the same composite id drops
    the recurrenceId (scope "all", recurrenceId null) and targets the
    master; "thisAndFollowing" is never mintable (no code path).
  - Web (RsvpControl.test.tsx "offers This Event / All Events …"):
    Decline → dialog (nothing on the wire yet) → Ok posts to
    /event/<encoded eventId::recurrenceId>/rsvp with body
    {responseStatus: "declined", scope: "single"} — the composite id
    rides the URL, so the backend decode addresses exactly that
    occurrence. Controller test pins the decoded pass-through
    end-to-end (same input shape reaches submitCommand).
  - Idempotency: key = hash of event + status + scope (+ decoded
    recurrenceId), nonce-free — replaying the same answer reuses the
    key; changing answer, scope, or target mints a new one (tested).
type-check / lint / knip result: all exit 0. lint: 0 errors, 10
  pre-existing warnings (untouched files). knip: no findings
  (pre-existing .css configuration hint only).
deltas from spec (if any):
  - Route is POST /api/event/:id/rsvp (singular), matching the existing
    /api/event/:id write routes — the WP's "/api/events/:id/rsvp"
    spelling followed no existing route (README: prefer the code).
  - The endpoint answers 204 No Content, not "the updated event": the
    sync command outcome carries no event content and the sync client
    has no event-by-id lookup. The web is optimistic (self-entry
    rewrite) and settles the provider-confirmed list via the SSE-backed
    invalidation — the same way it discards create/replace's
    synthesized bodies. Auth/billing/maintenance parity with the other
    writes; deliberately NO writable-calendar gate (finish line 5) —
    pinned by a controller test whose sync-client stub has no
    listCalendars at all.
  - Scope dialog fires only for an OCCURRENCE of a series. A series-base
    answer submits scope "all" directly: a base id carries no
    recurrenceId, so "this event" is not representable for it (the
    translation would coerce it to the series anyway) and offering the
    choice would be a lie. Single events skip the dialog (pinned).
  - The rsvp mutation calls EventApi directly, bypassing the event
    repository: RSVP exists only for provider-backed events (control
    hidden on local calendars) and must skip the read-only target gate;
    the reconnect-required block stays. Series-wide answers serialize
    against the series write key like scope-"all" replaces and
    optimistically paint the master + every cached occurrence.
  - Self-identification is the calendar's accountEmail,
    case-insensitive, in both the gate and the optimistic rewrite —
    the same single mechanism sync uses (alias wart stands, WP-09).
  - EventForm reads the event live from the query cache (useEventById)
    for the RSVP control and EventDetailsSection, falling back to the
    draft snapshot: this is what makes the optimistic answer and other
    attendees' SSE-delivered RSVP changes paint without reopening the
    form.
  - needsAction is 400 INVALID_INPUT at the route (strict Zod parse, no
    sync call — a user answers, they don't un-answer); sync's typed
    unsupportedCapability refusals surface as 403 UNSUPPORTED_OPERATION
    (both tested).
  - Environment notes (unchanged from WP-02/03/07): IPv6-disabled
    kernel → scratchpad-only IPv4 preload shim for test:backend via
    BUN_OPTIONS (never committed); bun 1.3.11 vs pinned 1.3.14 (harness
    warns); Playwright chromium installed via `bunx playwright install
    chromium` for the a11y run.
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
