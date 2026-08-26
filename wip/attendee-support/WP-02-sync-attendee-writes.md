# WP-02 — Sync provider write path: attendee replace

**task_id:** WP-02
**status:** done
**owner:** Implementer (sync)
**depends on:** WP-01
**next owner after done:** WP-04 unblocks (with WP-03); WP-07 unblocks

## Why

Sync deliberately never writes attendees today. Four spots enforce it:
`merge-update-content.ts` merges only title/description/location/color;
`toGoogleBody` omits attendees; `matchesIntendedEdit` ignores them in
replay comparison; cloud records never receive them from commands. This
WP makes `attendeesEdit: "replace"` real while keeping
`"preserve"` byte-identical to today's behavior.

Key files:

- [`packages/sync/src/domain/merge-update-content.ts`](../../packages/sync/src/domain/merge-update-content.ts)
- [`packages/sync/src/domain/provider-command.service.ts`](../../packages/sync/src/domain/provider-command.service.ts)
  (`executeProviderUpdate` ~line 302, `matchesIntendedEdit` ~line 1389)
- [`packages/sync/src/domain/cloud-command.service.ts`](../../packages/sync/src/domain/cloud-command.service.ts)
- [`packages/sync/src/providers/google/google-event-writer.adapter.ts`](../../packages/sync/src/providers/google/google-event-writer.adapter.ts)
  (`toGoogleBody` ~line 300, `toSendUpdates` ~line 495)
- [`packages/sync/src/safety/safety-canary.ts`](../../packages/sync/src/safety/safety-canary.ts)
  (do not touch; keep green)

## Finish line

1. An update command with `attendeesEdit: "replace"` produces a Google
   patch whose `attendees` are the merge of the intended email set
   against the **freshly fetched** provider state: retained emails keep
   the provider's current responseStatus/displayName, new emails enter
   as `needsAction`, dropped emails are removed. The fake
   `GoogleEventsApi` asserts the exact body including `sendUpdates`.
2. Create commands with intended attendees emit them (organizer not
   synthesized; Google adds it).
3. Every `attendeesEdit: "preserve"` (and legacy) command produces a
   patch body byte-identical to today — regression tests prove it.
4. Replay safety: an attendee-only edit retried after landing confirms
   without a second write (`matchesIntendedEdit` compares email sets,
   order-insensitive, status-ignored, only when the command intent is
   `"replace"`); pure RSVP drift still never blocks replay.
5. A replace on an event the connection's account does not organize
   fails typed `unsupportedCapability` with no provider call.
6. Confirmed commands store the merged attendees on the sync record so
   reads reflect them before the next Google round-trip.
7. `bun test:sync` (incl. safety-canary suite) green; `type-check`,
   `lint`, `knip` green.

## Steps

1. Read the key files and their tests; read
   `00-context-and-invariants.md` merge rules.
2. Add `mergeAttendees(intended, providerCurrent)` (pure, exhaustively
   table-tested) beside `mergeUpdateContent`. Case-insensitive email
   match; preserve provider order for retained entries, append new ones.
3. Thread `attendeesEdit` through `executeProviderUpdate` and the create
   path. For attendees, merge against `current.content` (the fetched
   state), NOT sync's stored `event.content` — a concurrent RSVP between
   syncs must survive.
4. Organizer guard: if the stored/fetched organizer email ≠ connection
   account email (case-insensitive), fail `unsupportedCapability`
   before any provider write.
5. `toGoogleBody` gains attendees only when the write intends them
   (keep the existing "deliberately NOT written" comment accurate —
   rewrite it to describe the new rule).
6. Extend `matchesIntendedEdit` per finish line 4.
7. Update `cloud-command.service.ts` so cloud-only records store the
   intended attendees on replace.
8. Tests: fake `GoogleEventsApi` body assertions, merge table tests,
   preserve-regression snapshots, replay tests, organizer-guard test,
   canary assertion that a failed attendee command logs no attendee
   JSON.
9. Run the finish-line checks.

## Acceptance tests

- **Normal:** add one attendee to an event with three existing → patch
  body has four entries; existing statuses preserved even when one
  changed provider-side since last sync.
- **Incomplete input:** replace with `[]` → patch body `attendees: []`
  (explicit remove-everyone).
- **Tool failure:** provider fetch fails transiently → command stays
  pending/retryable, no patch sent.
- **Policy:** non-organizer replace → `unsupportedCapability`, no
  provider call; log/SSE output of a failed attendee command contains no
  attendee JSON (safety-canary).

## Evidence

Recorded 2026-08-26 (implementer: manager-loop takeover session; prior worker
lost to a spend limit with no code landed):

```text
commands run: bun test:sync (full, in-memory Mongo harness); bun run
  type-check; bun lint (after bun lint:fix for formatting of new test
  fixtures); bun knip
test:sync result: 1017 pass, 0 fail (78 files) — includes new/extended suites:
  merge-update-content.test.ts (mergeAttendees table, 9 cases + purity),
  google-event-writer.adapter.test.ts (exact insert/patch bodies with and
  without attendees, sendUpdates asserted), provider-command.service.db.test.ts
  ("attendeesEdit replace": merge-against-fetched, empty-set replace, organizer
  guard, fail-closed on unresolvable connection, replay by email set, patch on
  membership drift, preserve byte-identical, transient-fetch pending, series
  edit-all, scope-this / thisAndFollowing typed refusals, create needsAction
  normalization, legacy create), cloud-command.service.db.test.ts ("cloud-only
  attendeesEdit replace": stored-list merge, create normalization, occurrence/
  split refusals)
safety-canary tests pass: yes — safety-canary.ts untouched; full suite green
  within test:sync and packages/sync/src/safety/ re-run standalone under the
  harness (18 pass, 0 fail). New canary assertions: a failed non-organizer
  replace's outcome and the command route's log-line template contain no
  attendee JSON (findSafetyCanaryHit null), both provider-side and cloud-side.
preserve-regression proof:
  - adapter: "omits the attendees key when the write does not intend a guest
    edit" asserts the FULL insert body toEqual the pre-WP shape (no attendees
    key) even when content.attendees is populated, and the patch body has no
    attendees property.
  - executor: "keeps a preserve command byte-identical" asserts no attendees
    key on the patch input, content.attendees passed through as the stored
    (mergeUpdateContent) list, and the stored record's list untouched even
    when the command echoes stray attendees.
  - every pre-existing update/create/delete test (none set attendeesEdit;
    schema defaults to "preserve") passes unmodified.
type-check / lint / knip result: all exit 0. lint: 0 errors, 10 pre-existing
  warnings (untouched files). knip: no findings (pre-existing .css
  configuration hint only).
deltas from spec (if any):
  - Organizer guard needs the connection's account email, which no executor
    dep carried: ProviderMutationDeps/CloudCommandDeps gain a narrow
    `connections: ProviderConnectionLookup` (findById -> {account:{email}}),
    wired from syncRepositories in command.routes.ts and app.ts's
    stale-command sweep. Guard compares the STORED organizer (case-insensitive)
    BEFORE any provider call, fetch included; a null stored organizer passes
    (Compass-created event, the account organizes it); unverifiable states
    (missing connection row / no account email) fail closed with the same
    typed unsupportedCapability.
  - The intended membership rides the writer port as an optional
    `attendees` field on ProviderWriteBody (absent = merge-by-key leaves
    Google's list; present incl. [] = replace), NOT via content.attendees —
    content stays read-reflected and never reaches the body.
  - Beyond the spec's named executeProviderUpdate + create,
    executeProviderSeriesUpdate (scope "all") also supports replace (same
    fetch-merge-patch shape; the override-align patches carry the replaced
    membership so reverted overrides don't keep a stale guest list). Replace
    on scope "this"/"thisAndFollowing" (provider AND cloud) fails typed
    unsupportedCapability instead of silently preserving — per-occurrence
    guest lists have no v1 semantics, and dropped intent must not read as
    success.
  - Creates merge against an empty provider list, so every intended guest is
    normalized to needsAction regardless of the command's own responseStatus
    values; the merged list is stored on the record (finish line 6) for
    provider creates, cloud creates, and cloud updates (cloud updates merge
    against the STORED list — no provider copy exists).
  - Environment note: this container's kernel has IPv6 disabled and Bun's
    host-less listen() binds "::", so mongodb-memory-server could not boot.
    Validation ran with a TEMPORARY, uncommitted bunfig.toml preload shim
    forcing IPv4 binds (scratchpad-only; reverted before commit). Bun 1.3.11
    vs pinned 1.3.14 (harness warns; behavior identical here).
```

## Out of scope

- RSVP command execution (WP-07)
- Backend translation (WP-03)
- If-Match/etag retry loops (named wart)
- `guestsCanModify`

## Risks

- Google patch replaces the whole attendees array — a merge bug silently
  uninvites people. The merge function must be pure and table-tested
  before wiring it in.
- `provider-command.service.ts` is ~1600 lines; keep the diff surgical
  and lean on existing helpers.
- Do not compare create bodies to post-create readback (Google adds the
  organizer as accepted).

## Handoff

```yaml
task_id: WP-02
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
You are implementing WP-02 from
wip/attendee-support/WP-02-sync-attendee-writes.md in the Compass repo,
on branch claude/attendee-support-planning-nljgeg. Read
wip/attendee-support/README.md, TRACKING.md, and
00-context-and-invariants.md first, mark WP-02 running (owner +
started_at), push the ledger update, and do not start other WPs. WP-01
must be done.

Finish line: attendeesEdit "replace" merges by email against freshly
fetched provider state and patches Google (fake API asserts exact
bodies); "preserve" byte-identical to today; matchesIntendedEdit
compares email sets on replace only; organizer guard
unsupportedCapability; merged attendees stored on confirm; test:sync +
safety-canary + type-check + lint + knip green. Fill Evidence, update
TRACKING.md, commit conventionally, push.
```
