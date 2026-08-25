# WP-01 — Core write contracts

**task_id:** WP-01
**status:** queued
**owner:** Implementer (core)
**depends on:** none
**next owner after done:** WP-02 (sync) and WP-03 (backend) may start, in
parallel with different owners

## Why

Every write layer needs the same vocabulary before any of them can move:
an attendee *input* shape (no responseStatus — callers don't set other
people's RSVPs), an explicit "am I editing the guest list" signal, an
invitation intent on the browser API, and an RSVP command. Contracts live
in `packages/core` (shared Zod, see AGENTS.md), so this WP is pure
contracts + tests with **zero runtime behavior change**.

Key files:

- [`packages/core/src/types/event-attendance.contracts.ts`](../../packages/core/src/types/event-attendance.contracts.ts)
- [`packages/core/src/types/event-command.contracts.ts`](../../packages/core/src/types/event-command.contracts.ts)
- [`packages/core/src/types/sync/command.contracts.ts`](../../packages/core/src/types/sync/command.contracts.ts)

## Finish line

1. `AttendeeInputSchema` exists in `event-attendance.contracts.ts`:
   strictObject {email (trimmed, 1–320), displayName (trimmed 1–256,
   nullable)}; rejects any `responseStatus` key; an array refine rejects
   duplicate emails (case-insensitive).
2. `EditableContentSchema` gains optional
   `attendees: z.array(AttendeeInputSchema)`; omitted parses as before.
   Create/Replace event inputs gain optional
   `invitation: InvitationIntentSchema`; delete input gains it too
   (cancellation emails).
3. Sync create/update command inputs gain
   `attendeesEdit: z.enum(["replace", "preserve"]).default("preserve")`.
   Stored `SyncEventContentSchema` is unchanged.
4. A new `rsvp` member exists on `SyncCommandInputSchema`:
   {kind: "rsvp", responseStatus: enum(accepted|declined|tentative) —
   `needsAction` rejected, plus the same target fields update commands
   use so occurrence ids (`eventId::recurrenceId`) work}. A matching
   browser `RsvpEventInputSchema` exists in
   `event-command.contracts.ts` with
   `scope: z.enum(["single", "all"])` for recurring targets.
5. Every pre-existing contract test passes unmodified: payloads without
   `attendees` / `invitation` / `attendeesEdit` parse identically
   (defaults apply).
6. `bun test:core`, `bun run type-check`, `bun lint`, `bun knip` green.

## Steps

1. Read the three key files plus their colocated `*.test.ts` and
   `packages/core/src/types/sync/event.contracts.ts` (note
   `SyncEventContentSchema.attendees` is already required there).
2. Add `AttendeeInputSchema` (+ exported TS type) next to
   `AttendeeSchema`. Add a `uniqueAttendeeEmails` refine helper for
   arrays of it.
3. Widen `EditableContentSchema` and the create/replace/delete inputs in
   `event-command.contracts.ts`. These are strictObjects — additive
   optional fields only.
4. Add `attendeesEdit` to the sync create/update command inputs in
   `sync/command.contracts.ts`; add the `rsvp` union member. Check the
   union's discriminator and any recurrence-coherence refines — the rsvp
   member must satisfy or be exempted from them explicitly.
5. Add `RsvpEventInputSchema` to `event-command.contracts.ts`.
6. Tests (colocated): new-shape acceptance, `responseStatus` rejection
   on input attendees, duplicate-email rejection, legacy-payload
   round-trips (fixture JSON without the new fields → parsed output
   identical to before), rsvp `needsAction` rejection.
7. Run the finish-line checks.

## Acceptance tests

- **Normal:** a replace input with two attendees and
  `invitation: "all"` parses; parsed `attendeesEdit` on a sync update
  command carrying it round-trips.
- **Incomplete input:** attendee with empty email rejected; duplicate
  emails (case-insensitive) rejected; rsvp with
  `responseStatus: "needsAction"` rejected.
- **Tool failure:** n/a (contracts only).
- **Policy:** a legacy sync update command JSON without `attendeesEdit`
  parses with `"preserve"`; a legacy browser create without `attendees`
  or `invitation` parses identically to today (snapshot equality).

## Evidence

Record in this section when implementing:

```text
commands run:
test:core result:
type-check / lint / knip result:
legacy-payload snapshot proof:
deltas from spec (if any):
```

## Out of scope

- Any backend/sync/web behavior change (they still ignore the fields)
- `guestsCanModify`, conference editing
- Contact contracts (WP-05 owns `contact.contracts.ts`)

## Risks

- `EditableContentSchema` is embedded in create/replace and re-used by
  web fixtures and backend tests — a strictObject mistake breaks many
  suites at once. Run `bun test:backend:fast` and `bun test:web` locally
  if in doubt; they must stay green even though this WP only claims
  core.
- The sync command union has cross-field refines; adding a member
  carelessly can change error messages other tests assert on.

## Handoff

Fill when stopping mid-WP:

```yaml
task_id: WP-01
from:
to: Implementer (core)
status:
artifact:
evidence:
assumptions:
open_risks:
next_deadline:
```

## Session prompt

```text
You are implementing WP-01 from
wip/attendee-support/WP-01-core-write-contracts.md in the Compass repo,
on branch claude/attendee-support-planning-nljgeg. Read
wip/attendee-support/README.md and TRACKING.md first, mark WP-01 running
(owner + started_at), push the ledger update, and do not start other
WPs.

Finish line: AttendeeInputSchema (no responseStatus, unique emails);
optional attendees on EditableContentSchema; optional invitation on
create/replace/delete inputs; attendeesEdit enum(replace|preserve)
default preserve on sync create/update commands; rsvp command member +
RsvpEventInputSchema (accepted|declined|tentative only, occurrence
targeting); all legacy payloads parse unchanged. bun test:core,
type-check, lint, knip green. Zero runtime behavior change. Fill
Evidence, update TRACKING.md, commit conventionally, push.
```
