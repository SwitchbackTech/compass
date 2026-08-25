# WP-01 — Core write contracts

**task_id:** WP-01
**status:** done
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

Recorded 2026-08-25 (implementer: manager-loop session):

```text
commands run: bun test:core; bun run type-check; bun lint (after bun
  lint:fix for formatter/import-order); bun knip; regression: bun
  test:backend:fast, bun test:web, bun test:sync:fast
test:core result: 605 pass, 0 fail (36 files) — includes new
  event-attendance.contracts.test.ts and extended event-command /
  sync command contract tests
type-check / lint / knip result: all exit 0. lint: 0 errors, 10
  pre-existing warnings (untouched files). knip: no findings (one
  pre-existing .css configuration hint only)
regression: test:web 2331 pass 0 fail; test:sync:fast 361 pass 0 fail;
  test:backend:fast 282 pass / 20 fail — the same 20 failures (SSE
  Server 11, supertokens.middleware.util 6, GET /api/config 3) fail
  identically on the base commit 65452e3 with the work tree stashed:
  sandbox-environment issues, unrelated to this WP
legacy-payload snapshot proof:
  - event-command.contracts.test.ts: "parses a legacy payload without
    attendees or invitation to an identical output" (create + replace,
    toStrictEqual against the input) and delete "parses a legacy payload
    without an invitation to an identical output"
  - sync/command.contracts.test.ts: "defaults a legacy %s input without
    attendeesEdit to preserve" (create/update) and "parses a legacy
    update command JSON without attendeesEdit with preserve" (JSON
    fixture through SyncCommandSchema); pre-existing round-trip test
    unchanged and green
deltas from spec (if any):
  - EditableContentSchema.attendees is z.array(AttendeeInputSchema)
    .readonly().refine(...) — readonly mirrors the read-side lists and
    keeps a replayed Event["content"] structurally assignable to the
    write input (undo/redo funnels full read content through it).
  - The browser inputs use a new undefaulted InvitationIntentValueSchema
    (exported from event-command.contracts.ts); sync's
    InvitationIntentSchema now derives from it via .default("none")
    (identical semantics, no import cycle, and legacy browser payloads
    stay snapshot-identical because no default is injected).
  - RsvpResponseStatusSchema lives in event-attendance.contracts.ts
    (AttendeeResponseStatusSchema.exclude(["needsAction"])) so the
    browser input and the sync rsvp command share one enum.
  - The sync rsvp member reuses update's exact target fields
    (scope: RecurrenceScopeSchema, recurrenceId nullable default null)
    and is explicitly included in the recurrence-coherence refine on
    SyncCommandSchema / CommandSubmitRequestSchema.
  - Type-level companion edits in web keep type-check green with zero
    runtime behavior change: grid-event-draft.adapter.ts widens
    detailsLocation/editableContent to accept write-input content;
    useEventMutations.ts filters replayed read-state attendee entries
    (responseStatus present) when building optimistic Event content —
    replay flows behave byte-identically, a pure guest-edit input (none
    exist yet) contributes nothing optimistic; local.event.repository.ts
    drops the write-only attendees key (local calendars have no attendee
    support and the wire boundary already strips it at runtime); three
    web test stubs mirror the same key drop.
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
