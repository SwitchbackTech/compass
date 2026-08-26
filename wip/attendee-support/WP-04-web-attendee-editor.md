# WP-04 — Web attendee editor + "send invitations?" prompt

**task_id:** WP-04
**status:** done
**owner:** Implementer (web)
**depends on:** WP-02 and WP-03 (this WP turns editing ON)
**next owner after done:** WP-06 unblocks (with WP-05); WP-08 borrows
form conventions

## Why

This is the launch gate: the first WP whose merge makes attendee editing
user-visible. The event form gets an email-chip combobox; the draft
adapter and mutations start carrying attendees; saving with a changed
guest set asks whether Google should email invitations.

Key files:

- [`packages/web/src/views/Forms/EventForm/EventForm.tsx`](../../packages/web/src/views/Forms/EventForm/EventForm.tsx)
- [`packages/web/src/views/Forms/EventForm/EventDetailsSection.tsx`](../../packages/web/src/views/Forms/EventForm/EventDetailsSection.tsx)
  (stays the read-only renderer for read-only events)
- [`packages/web/src/events/grid-event-draft.adapter.ts`](../../packages/web/src/events/grid-event-draft.adapter.ts)
  (`editableContent()` runtime pick)
- [`packages/web/src/events/mutations/useEventMutations.ts`](../../packages/web/src/events/mutations/useEventMutations.ts)
  (`mergeReplaceContent`)
- [`packages/web/src/views/Forms/hooks/useSaveEventForm.ts`](../../packages/web/src/views/Forms/hooks/useSaveEventForm.ts)
- Building blocks: react-select `CreatableSelect` (pattern:
  [`TimePicker.tsx`](../../packages/web/src/views/Forms/EventForm/DateControlsSection/DateTimeSection/TimePicker/TimePicker.tsx)),
  [`form.util.ts`](../../packages/web/src/common/utils/form/form.util.ts)
  (`isComboboxInteraction`),
  [`floating-layer.ts`](../../packages/web/src/shortcuts/floating-layer.ts)

## Finish line

1. On a writable Google calendar, the event form shows an `AttendeeField`
   (CreatableSelect, isMulti, email chips). Adding/removing chips and
   saving sends `content.attendees` + `invitation`; untouched guest
   lists omit both (preserve semantics) and show no prompt.
2. When the guest set changed, save asks "Send invitation emails?" —
   Send (default, `"all"`) / Don't send (`"none"`).
3. Optimistic UI: new attendees render as `needsAction` immediately and
   settle from sync.
4. Non-Google / read-only calendars: no editor; the existing read-only
   guest list is unchanged.
5. Keyboard: Enter inside the combobox creates a chip and does not
   submit the form (`isComboboxInteraction` participation); Escape
   closes the listbox before the form (`useFloatingLayer` registered).
6. Invalid email strings cannot become chips (inline rejection).
7. `bun test:web` and `bun test:a11y` green; semantic colors only;
   `type-check`, `lint`, `knip` green.

## Steps

1. Read the key files, `00-context-and-invariants.md`, and the
   TimePicker CreatableSelect styling.
2. Build `AttendeeField` under
   `packages/web/src/views/Forms/EventForm/AttendeeField/` with a
   pluggable suggestion-source prop (static empty for now — WP-06 plugs
   contacts in). Chips show displayName or email; removal via
   backspace/click; email validation on create.
3. Wire draft state: `editableContent()` includes `attendees` only when
   the draft touched them; draft store patch helpers as needed.
4. `useSaveEventForm`: detect guest-set change (email-set inequality vs
   the source event), show the prompt (reuse the existing dialog
   patterns, e.g. `RecurrenceScopeDialog` styling), map to
   `invitation`.
5. `useEventMutations`: optimistic merge of intended attendees
   (`mergeReplaceContent` update) and rollback on failure.
6. Gate rendering: `calendar.provider === "google"` and writable, and
   the user organizes the event (non-organizer sees read-only list —
   sync would reject anyway, don't offer the editor).
7. RTL tests (semantic queries) + MSW handlers asserting payloads;
   keyboard/layer tests; a11y sweep on the new control.
8. Run the finish-line checks.

## Acceptance tests

- **Normal:** add two chips, save, choose Send → MSW asserts
  `attendees` + `invitation: "all"`.
- **Incomplete input:** paste "not-an-email" → inline rejection, no
  chip, form still submittable.
- **Tool failure:** save 503 → existing retry/rollback path restores the
  previous guest list.
- **Policy:** read-only event renders the legacy read-only list with no
  input; untouched-guest-list save omits `attendees` and shows no
  prompt.

## Evidence

Recorded 2026-08-26 (implementer: manager-loop session):

```text
commands run: bun test:web; bun test:a11y (plus a long-timeout rerun, see
  below); bun run type-check; bun lint (after bun lint:fix for formatting);
  bun knip. All re-run on the final tree.
test:web result: 2362 pass, 0 fail (312 files) — includes new suites
  AttendeeField.test.tsx (7: chip create on Enter without form submit,
  invalid-email inline rejection with form still submittable, duplicate
  refusal case-insensitive, displayName chips + remove button, Backspace
  removal, Escape closes listbox first + floating-layer registration,
  pluggable suggestion source), EventForm.attendees.test.tsx (8: editor
  gating — organized/writable-Google renders combobox and read-only list
  stands down; non-organizer, read-only calendar, local calendar, and
  series occurrence keep the legacy read-only list; series base and
  organizer-less (Compass-created) events get the editor; Enter in the
  combobox never submits while Enter elsewhere still does),
  useSaveEventForm.attendees.test.tsx (8: untouched and
  touched-but-unchanged saves omit attendees+invitation with no prompt;
  changed set prompts BEFORE any mutation; Send→"all", Don't send→"none",
  Cancel aborts; create-with-guests prompts and threads attendees;
  recurring non-"all" belt drops the guest edit; series-wide "all" keeps
  it), useEventMutations.attendees.test.tsx (5, see MSW proof),
  RecurrenceScopeDialog.test.tsx (2: guest-changed narrowing) and a
  shouldConfirmDiscardUnsavedChanges case (guest change dirty; touched-but-
  restored not dirty). Pre-existing MSW "GET /api/calendars" unhandled-
  request noise is identical on the base tree with the work stashed.
test:a11y result: `bun test:a11y` at its default 30s per-test timeout fails
  6 of 7 in THIS container with axe `frame.evaluate` timeouts — the base
  tree with the work stashed fails the IDENTICAL 6 the same way
  (environment slowness, not WP-04). With the same suite run as
  `bunx playwright test e2e/accessibility --timeout=180000` on the final
  tree, all 7 pass (axe "incomplete" items are logged, not failures, per
  docs/development/testing-playbook.md). Not claiming the default-timeout
  command green.
payload assertion proof (MSW): useEventMutations.attendees.test.tsx drives
  the real RemoteEventRepository -> EventApi -> BaseApi(fetch) stack into
  MSW handlers that capture the request body: (1) a guest-edit replace puts
  content.attendees (input shape, no responseStatus) and invitation "all"
  on the wire; (2) an untouched save's body has NO attendees key and NO
  invitation key (preserve semantics, byte-compatible with pre-WP saves);
  (3) a replayed read-shaped guest list (undo/redo content with
  responseStatus) is stripped at the wire boundary — the body has no
  attendees key, so replays keep pre-WP behavior and never trip sync's
  organizer guard. Same file also proves the optimistic contract: retained
  guests keep their provider responseStatus/displayName, new guests paint
  as needsAction immediately, and a failed save rolls the cached guest
  list back to its pre-edit state.
type-check / lint / knip result: all exit 0. lint: 0 errors, 10
  pre-existing warnings (untouched files). knip: no findings (pre-existing
  .css configuration hint only).
recurring-event UX choice (documented per spec): guest edits are
  series-wide only, implemented as BOTH halves of the spec's alternatives,
  each where it matches existing UX: (a) a single occurrence of a series
  never renders the editor (occurrence edits flow through scope "this" +
  the promotion toast, which sync refuses for guest replacements — the
  read-only guest list stays); (b) a series-base edit renders the editor,
  and when the guest set changed the RecurrenceScopeDialog narrows its
  options to just "All Events" with an explanatory line — the same
  narrowing mechanism the dialog already uses for structural recurrence
  changes (RECURRENCE_CHANGED_UPDATE_SCOPE_OPTIONS). A belt in
  useSaveEventForm drops (console.warn) any guest edit that still arrives
  on a recurring event at a non-"all" scope rather than submitting a
  command sync would refuse asynchronously.
deltas from spec (if any):
  - editableContent() now forwards attendees across the wire boundary ONLY
    for genuine guest edits (no entry carries responseStatus, entries
    re-picked to {email, displayName}); replayed read-shaped lists are
    dropped as before. Consequence: undo/redo does not restore guest
    membership (replays stay preserve, byte-identical to pre-WP) — accepted
    v1 limitation, mirrors WP-01's replay/guest-edit split.
  - WP-01's "a pure guest-edit input contributes nothing optimistic" note
    is superseded per this WP's finish line 3: mergeReplaceContent /
    optimisticEventFromCreate now merge intended guests by email against
    the cached list (retained keep status, new enter needsAction, dropped
    disappear), mirroring sync's mergeAttendees and the backend's
    synthesized response; rollback rides the existing snapshot restore.
  - A touched-but-unchanged guest list (case-insensitive email-set equality
    vs the source) is normalized back to "not editing guests" before parse
    AND in the discard-confirmation dirty check, so add-then-remove behaves
    exactly like never touching the field.
  - The prompt also covers create drafts that added guests (guest set
    changed from empty); a create belt drops guest edits when the resolved
    target calendar is not a writable Google calendar.
  - Organizer detection compares the source event's organizer email to the
    calendar's accountEmail (case-insensitive); a null organizer counts as
    organized (Compass-created — matches WP-02's sync guard); an
    unverifiable account email fails closed to the read-only list.
  - AttendeeField's pluggable source is `suggestionSource?: (query:
    string) => Promise<readonly AttendeeInput[]>` (default resolves []);
    WP-06 swaps in the contacts proxy without touching the field.
  - The invitation dialog is a new SendInvitationsDialog (OverlayPanel,
    Send focused as the default) rendered by SidebarEventDetails from the
    `invitationPrompt` state useSaveEventForm now returns; invitation rides
    the parsed input at the top level (spread after parse — the strict
    schemas already model it as optional).
  - Environment note: container runs bun 1.3.11 vs pinned 1.3.14 (harness
    warns); Playwright chromium installed via `bunx playwright install
    chromium` for the a11y run.
```

## Out of scope

- Contact suggestions and the enable-contacts nudge (WP-06)
- RSVP control (WP-08)
- Editing organizer or conference

## Risks

- This merge is the launch: WP-02 and WP-03 must be `done` and green on
  the branch first — verify TRACKING before starting.
- The form's global Enter/Delete/digit shortcuts leak into new inputs
  easily; test the combobox against `form.util.ts` gating explicitly.
- react-select must be themed with semantic tokens (`bun lint` runs the
  semantic-color check).

## Handoff

```yaml
task_id: WP-04
from:
to: Implementer (web)
status:
artifact:
evidence:
assumptions:
open_risks:
next_deadline:
```

## Session prompt

```text
You are implementing WP-04 from
wip/attendee-support/WP-04-web-attendee-editor.md in the Compass repo,
on branch claude/attendee-support-planning-nljgeg. Read
wip/attendee-support/README.md, TRACKING.md, and
00-context-and-invariants.md first, mark WP-04 running (owner +
started_at), push the ledger update, and do not start other WPs. WP-02
and WP-03 must be done.

Finish line: AttendeeField email-chip combobox (CreatableSelect,
pluggable suggestion source) in the event form on writable Google
calendars the user organizes; changed guest set → save-time "Send
invitation emails?" prompt defaulting to Send; untouched → omit
attendees, no prompt; optimistic needsAction chips with rollback;
keyboard/floating-layer correctness; test:web + test:a11y + type-check
+ lint + knip green. Fill Evidence, update TRACKING.md, commit
conventionally, push.
```
