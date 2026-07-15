# Production cutover execution — 2026-07-15

Operator log and execution plan for the sub-calendar v1 production big-bang
cutover. Procedure source of truth:
[`google-subcalendar-big-bang-runbook.md`](./google-subcalendar-big-bang-runbook.md)
Phase P. Gate: [`prod-go-no-go-checklist.md`](./prod-go-no-go-checklist.md).
Operator: Claude (driving from the founder's trusted admin machine), with the
founder (Tyler) as rollback owner confirming every irreversible gate.

> **Private operator notes:** hostnames, cluster addresses, SSH details, config
> and backup paths live in `~/src/compass/private-docs/prod-cutover-2026-07-15-operator-notes.md`
> on the operator machine — deliberately outside git. This doc says "operator
> notes" wherever such a value is needed.

## Founder decisions (2026-07-15)

1. **Release tag**: the tag cut from this PR's merge (runtime code
   byte-identical to `v1.0.235`, the founder-validated staging build — the
   delta is docs, the backfill string-`_id` fix, and its test). Staging
   auto-deploys it before prod does. Originally `v1.0.235` was chosen; the
   rehearsal-discovered backfill bug forced a fix, and the founder approved
   shipping it as a new tag rather than running migrations from an unreleased
   checkout.
2. **Staging gate closed**: 12-step acceptance founder-validated on staging;
   the Phase S3 rollback + second-forward-run rehearsal **waived** (waiver and
   rationale recorded in the runbook's evidence table).
3. **Execution mode**: Claude drives; Tyler confirms each gate (window open,
   backend stop, collection rename, deploy).
4. **Data-policy deletion approved**: all 168,015 flagged legacy rows
   (167,878 by `_id` list + 137 empty docs), preserved in backup and
   `event_legacy_v1`.
5. **Sync-token reset scope**: the 165 affected users only (id list preserved
   with the backup artifacts — operator notes), followed by a post-deploy
   `maintain-all` call to trigger their full Google re-imports.

## Production facts verified during preflight (2026-07-15)

| Fact | Value | How verified |
| --- | --- | --- |
| Prod frontend | `https://compasscalendar.com`, `/version.json` = `1.0.97` | curl |
| Prod VPS | SSH access verified (host/key in operator notes) | SSH |
| Prod containers | `compass-backend-1` (`1.0.97`, healthy), `compass-web-1` (`production-1.0.97`), `compass-static` | `docker ps` over SSH |
| Prod Mongo | Managed Atlas cluster (address in operator notes), db `prod_calendar`, Mongo 8.0.27, shared tier (`allowDiskUse` unsupported) | `mongosh` |
| Event collection | Legacy: 989,268 docs; 989,131 `user`-owned; 0 `calendarId`-owned; no validator; no `event_new`/`event_legacy_v1` | `mongosh` |
| Users / calendars | 941 users; 908 `calendar` rows (33 users have none — the calendar migration creates each user's local calendar) | `mongosh` |
| Migrations ledger | 5 records (`2025.10.03` … `2025.10.16`); ledger field is `migrationName` | `mongosh` |
| Pending migrations | 7: the `2025.10.18` prototype pair + the five v1 migrations | `bun run cli migrate pending` with the prod config |
| Disk headroom | `prod_calendar` ≈ 197 MB on disk (data 466 MB, storage 87 MB, index 109 MB); backfill's second copy fits at any Atlas tier | `db.stats()` |
| CI for `v1.0.235` | `Test`, `Release on main`, `CodeQL` all green at SHA `6d9a46fd6` | `gh run list --commit` |
| Docker Hub images | `compass-backend:1.0.235`, `compass-mongo:1.0.235`, `compass-web:1.0.235` present; `production-1.0.235` web image is built by the deploy workflow | Docker Hub API |
| `migrate up --to` | Supported (Umzug 3.8.2 CLI) | CLI + `node_modules/umzug` source |
| Preflight dump | 996,660 docs, 33 MB gzipped, ~90 s wall (path in operator notes) | `mongodump` (read-only) |
| Restore test | Restored into a local Mongo 8.0 single-node replica set: 996,660 restored, 0 failures, counts match prod exactly | `mongorestore` + count comparison |

## Production-specific findings the runbook did not cover

### 1. The `2025.10.18` prototype pair is unexecuted on prod

Staging ran `2025.10.18T19.43.00.new-events-collection` and
`2025.10.18T20.01.14.migrate-events-to-new-events-collection` back in October
2025 under contemporaneous code; prod's ledger stops at `2025.10.16`. On prod,
`migrate up --to …event-record-backfill` therefore runs this frozen prototype
pair first — a path **no environment has exercised under v1.0.235**. The v1
backfill was built to tolerate it: it collMods the final validator onto
`event_new`, drops the prototype indexes by name, and `deleteMany`s the
destination before writing. The dry-run rehearsal (below) validates the full
7-migration sequence on a restored copy of production data before the window.

### 2. Data-policy rows present on prod (will fail-close the backfill)

The backfill is fail-closed and the documented remedy is operator deletion of
the named rows ([event-migration-runbook — cutover data policy](../../docs/self-hosting/event-migration-runbook.md)).
**The dry-run rehearsal measured the real scale: 168,015 legacy rows (17% of
the collection) fail the strict contract and must be deleted before the
backfill passes** — far beyond what ad-hoc preflight queries suggested. Every
flagged row is Google-linked (`gEventId` set), i.e. re-importable from Google,
which is exactly the data policy's "recoverable from its source of truth"
criterion. Composition (from rehearsal runs 3–5):

| Class | Count | Nature |
| --- | --- | --- |
| `invalidDates` | 40,668 | Mostly old Google imports saved with offset-less datetimes (`2022-11-19T09:00:00`, no zone); includes the 7,224 zero-duration rows; 139 users |
| `missingRecurrenceBase` | 36,621 + 43,513 cascade | Orphaned Google recurring occurrences (base row absent), concentrated in **4 users**; the cascade is occurrences of bases deleted in the first pre-clean round |
| `emptyRecurrenceRules` | 16,857 | `recurrence.rule: []` Google rows, **5 users** |
| `missingPrimaryGoogleCalendar` | 15,423 | Google events of users with no Google calendar row (disconnected accounts), **12 users** |
| `invalidShape` | 13,490 | Malformed Google import rows, **13 users** |
| `duplicateOrWriteError` | 1,290 | Duplicate `gEventId` copies (first write wins), **2 users** |
| `flagDateMismatch` / `recurrenceConflict` | 16 | Contradictory flag/date or rule+eventId rows |
| Empty docs (`_id` only) | 137 | Unreachable by any user; fail the verifier's re-scan |
| Events of deleted user accounts | **0** | n/a on prod |
| Legacy someday rows | 3,614 | **Not deleted** — counted `excludedSomeday`, stays in the legacy collection |

**Affected users: 166 of 941** (154 with Google sync records). Heavily
concentrated: the top two accounts hold 50,379 and 37,111 rows (~52% of the
total — broken historical imports); only 68 users lose more than 10 rows.

All deletions happen **inside the window, after the backup**, so every deleted
row is preserved in the backup and in `event_legacy_v1`. The `_id` lists come
from the backfill's own failure output (run to a fixed point — deleting a
series base orphans its occurrences, so expect 2–3 delete/rerun iterations),
never from hand-written queries.

### 2b. Deleted Google rows do NOT come back by themselves — token reset required

The cutover does not touch the `sync` collection, so users' Google
`nextSyncToken`s survive. Incremental sync only fetches Google-side changes
made after the token — it never re-fetches events deleted from Compass's own
collection. With healthy tokens, sign-in stays on `SIGNIN_INCREMENTAL` and
watch maintenance never escalates to a full import
(`packages/backend/src/auth/services/google/util/google.auth.util.ts`,
`google-watch-state.ts`). Remediation, part of the window:

- For the **166 affected users**: clear `sync.google.events` entries (null the
  tokens). This flips `canDoIncrementalSync` to false → their next sign-in
  takes `RECONNECT_REPAIR` → full Google re-import; and
  `inspectGoogleWatchState` reports `FULL_REPAIR_REQUIRED` → the maintenance
  endpoint rebuilds them without waiting for sign-in.
- Post-deploy: call `POST /api/sync/maintain-all` (header `x-comp-token:
  $COMPASS_SYNC_TOKEN`) to proactively run that repair for affected users.
- Re-import safety: the unique `externalReference` index + upsert import path
  prevents duplicates (validated on staging by the `v1.0.209`–`v1.0.211`
  forced resyncs).

### 3. Dry-run rehearsal on restored prod data (pre-window)

The restore-test copy doubles as a full forward rehearsal: run the entire
migration sequence + rename + post-cutover repairs against the local restored
copy, capture every failure `_id`, and record real timings for the window
estimate. This partially compensates for the waived S3 rehearsal (forward path
only; rollback remains untested by founder-accepted waiver).

**Rehearsal results (2026-07-15):**

- **Run 1** (`migrate up --to …backfill`, all 7 pending): **failed in ~1 s.**
  `2025.10.18T20.01.14` crashed on a real prod event with no `title` (its frozen
  `EventNewSchema` requires one) after logging "No calendar found" skips for a
  user with no calendar row. Confirms the prototype pair cannot run on prod data
  under current code → **decision: mark the pair executed in the ledger without
  running it** (mirrors staging's final ledger state; the v1 backfill rebuilds
  `event_new` from scratch and owns its validator/indexes). Ledger insert shape:
  `{ migrationName: "<name>" }`.
- **Operational hazard found**: `bun run cli migrate up` **exits 0 even when a
  migration fails.** In the window, success is judged by the log output and by
  ledger/collection state — never by exit code, and never chained with `&&`.
- **Run 2** (pair ledger-skipped; calendar migration + backfill): calendar
  migration **passed** (1,849 calendar rows = 908 reshaped + 941 created local
  calendars; validator and indexes applied). Backfill **crashed mid-run**:
  `base._id.toHexString is not a function`. Root cause: **1,712 prod events
  carry string `_id`s** (all valid 24-hex; an anomalous import path), 12 of them
  series bases. The transform tolerates string `_id`s by design
  (`z.union([ObjectId, string])`) but the per-user series-base scan did not.
  Staging data never had string `_id`s, so no environment had hit this.
- **Fix**: one-line guard in the base scan of
  `2026.07.10T21.30.00.event-record-backfill.ts` (accept string or ObjectId),
  plus a regression test, shipped through the normal PR flow with this doc set.
- **Run 3** (fix applied): scan completed —
  `attempted=989131 inserted=861152 failed=124365 excludedSomeday=3614`.
  Fail-closed as designed; failure list captured (see the data-policy section).
- **Run 4** (after deleting the 124,365 + 137 empty docs): 43,513 new
  `missingRecurrenceBase` failures — the cascade from deleted series bases.
  Pre-clean must run to a fixed point.
- **Run 5** (after cascade delete): **converged and verification PASSED** —
  `attempted=821253 inserted=817639 failed=0 excludedSomeday=3614`;
  `legacyTotal=821253 destinationTotal=817639`, categories match exactly
  (`timed 492,544 / allDay 325,095`), `seriesCount=9898`,
  `occurrenceCount=632035`.
- **Rename + post-cutover repairs**: rename instant; the three repairs ran in
  **8 s** (`0` someday leaks, validator updated; `seriesScanned=9898,
  echoDuplicatesRemoved=0, firstOccurrencesBackfilled=0`; priority cleared from
  0 docs; `priority` collection dropped).
- **Final state checks**: validation `strict`; `priority` absent from
  required + properties; 0 events with `priority`;
  `db.event.validate({full:true}).valid === true`; **12 ledger records**
  (identical set to staging); 0 active someday rows.

**Window timing estimate (from rehearsal wall-clock on the full prod copy):**
dump ≈ 90 s; backfill scan ≈ 90 s + verify ≈ 60 s per iteration (expect 1–2
iterations after the list-based pre-clean); pre-clean deletes ≈ 60 s; rename
instant; repairs ≈ 10 s; deploy + health check ≈ 10 min (workflow-bound).
**Total window ≈ 20–30 minutes** including slack.

## Execution sequence (the window)

Timings in brackets to be filled from the rehearsal.

### GATE 1 — window open (Tyler confirms; downtime announced)
1. Tyler triggers an **Atlas on-demand snapshot** of `production1` and records
   the snapshot id here: `_______`
2. Fresh `mongodump --gzip` of `prod_calendar` (the formal backup — the only
   rollback for the in-place `calendar` migration). Verify counts; record here:
   `_______`

### GATE 2 — stop writes (Tyler confirms)
3. SSH to the prod VPS (operator notes) and
   `docker compose --project-name compass stop backend`
   (web/static stay up; Mongo is external). Verify no writes via `db.currentOp()`.
4. **Ledger-mark the 2025.10.18 prototype pair** (rehearsal-validated; they
   crash on prod data and are fully superseded by the v1 backfill):
   insert `{ migrationName: "2025.10.18T19.43.00.new-events-collection" }` and
   `{ migrationName: "2025.10.18T20.01.14.migrate-events-to-new-events-collection" }`
   into `prod_calendar.migrations`. Confirm `migrate pending` then lists
   exactly the five v1 migrations.
5. **Data-policy pre-clean** (founder-approved; after the backup): delete the
   167,878 events by `_id` list (preserved with the backup artifacts —
   operator notes) plus
   `deleteMany({user: {$exists: false}})` for the 137 empty docs. Record
   deleted counts here: `_______`. Expect small residue from rows written
   after the preflight dump — handled by the delete/rerun loop in step 6.
6. `COMPASS_CONFIG_FILE=<prod config, operator notes> bun run cli migrate up --to 2026.07.10T21.30.00.event-record-backfill`
   — runs the calendar migration and the backfill.
   **Judge success by the log line `Event backfill verification passed` and by
   ledger/collection state — the CLI exits 0 even on failure.**
   If the backfill throws with *data-policy class* failures (rows created
   since the dump): delete exactly the named `_id`s and rerun — it is
   convergent (rehearsed). Any *verification mismatch* (count/hash/category)
   → abort to rollback; do not rename.
7. **Sync-token reset** for the 165 affected users (id list — operator
   notes): clear their `sync.google.events` tokens so post-deploy maintenance
   runs a full Google re-import for them.
8. Verify `event_new`: strict validator, final indexes, zero someday rows,
   counts match the verification summary.

### GATE 3 — rename (Tyler confirms; the point of no easy return)
9. ```javascript
   use prod_calendar;
   db.event.renameCollection("event_legacy_v1");
   db.event_new.renameCollection("event");
   ```
10. `COMPASS_CONFIG_FILE=<prod config, operator notes> bun run cli migrate up`
    — runs the three post-cutover repairs against the now-active `event`.
11. Strict-validator checks (runbook Phase S1 step 7): validation `strict`,
    `priority` absent, zero `priority` fields, `db.event.validate({full:true})`
    valid, ledger records all 12 migrations exactly once.

### GATE 4 — deploy (Tyler confirms; checklist sign-off happens here)
12. `gh workflow run deploy-production.yml -f tag=<TAG>` (the tag cut from this
    PR) — watch the run and the automated health check (version gate,
    `/api/health`, Mongo data, log scan, Discord alert on failure).

### Post-cutover
13. `/version.json` = `<TAG>`; manual smoke (sign in, week view, create/edit/
    delete timed + all-day, calendar list + visibility toggles, Google-side
    change reconciles); backend logs clean of Mongo code `121`,
    `Document failed validation`, `Re-sync failed`, `ERRORED`, fatal,
    unhandled rejections.
14. `POST /api/sync/maintain-all` with `x-comp-token: $COMPASS_SYNC_TOKEN` —
    triggers `FULL_REPAIR_REQUIRED` full Google re-imports for the 165
    token-reset users. Spot-check a few of the most-affected accounts regain
    their Google events; watch for import errors.
15. **Keep `event_legacy_v1`** (rollback source — do not drop in v1). Retain
    the backups. Watch logs/Discord for several hours.
16. Final results commit to this file; merge the docs PR.

## Abort rules (bright lines, from the go/no-go checklist)

Abort to rollback, without debate, if any of these occur:
- The backfill verification summary does not pass (after the pre-clean).
- The strict-validator checks fail after the post-cutover repairs.
- The automated health check fails, or `/version.json` ≠ `1.0.235`.
- Any Mongo code `121` during or after the run.

## Rollback (rehearsed forward-only; reverse path is founder-accepted risk)

1. Stop the backend.
2. `mongodump` the post-cutover `event` collection (preserves post-cutover writes).
3. Reverse rename: `event` → `event_new`, `event_legacy_v1` → `event`.
4. `gh workflow run deploy-production.yml -f tag=v1.0.97`.
5. Confirm legacy events readable; if `calendar` is implicated, restore it from
   the GATE 1 backup / Atlas snapshot (its migration has no programmatic reverse).
6. Preserve all dumps and logs for reconciliation; drop neither event collection.

## Live log

| Time (local) | Step | Result |
| --- | --- | --- |
| 14:2x | Preflight state queries against prod | Legacy shape confirmed (see facts table) |
| 14:34 | Read-only preflight `mongodump` | 996,660 docs, 0 errors, ~90 s |
| 14:36 | Restore test into local Mongo 8.0 replica set | 996,660 restored, 0 failures, counts match |
| 14:37 | Rehearsal run 1 (all 7 pending) | Failed in ~1 s: 2025.10.18 prototype pair crashes on prod data → ledger-mark decision |
| 14:39 | Reset + ledger-mark pair; run 2 (calendar migration + backfill) | Calendar migration passed (1,849 rows); backfill crashed on string `_id` series bases → code fix |
| 14:4x | Run 3 (fix applied) | Fail-closed cleanly: 124,365 data-policy failures enumerated |
| 14:47 | Run 4 (after round-1 pre-clean of 124,502 rows) | 43,513 cascade failures (orphaned occurrences of deleted bases) |
| 14:53 | Run 5 (after cascade delete) | **failed=0; verification PASSED** (817,639 destination rows; categories exact) |
| 14:55 | Rename + `migrate up` (3 repairs) + strict-validator checks | All green in 8 s; 12 ledger records; validate full valid |
| 15:0x | Founder approvals | 168k deletion approved; fix ships as new tag via PR; token reset for 165 affected users |
