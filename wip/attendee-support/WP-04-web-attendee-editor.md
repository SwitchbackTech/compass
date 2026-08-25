# WP-04 — Web attendee editor + "send invitations?" prompt

**task_id:** WP-04
**status:** queued
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

```text
commands run:
test:web / test:a11y result:
payload assertion proof (MSW):
type-check / lint / knip result:
deltas from spec (if any):
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
