# Event migration runbook (sub-calendar v1)

> Compass-operated staging and the coordinated production release used the
> [Google sub-calendar big-bang deployment runbook](https://github.com/SwitchbackTech/compass-calendar/blob/90696e1dd9b279f7f1c56be0cef93b8b9c5787fe/team/architect/google-subcalendar-big-bang-runbook.md)
> (archived after v1 shipped to production on 2026-07-15 — see
> `compass-calendar-internal/projects/google-subcalendars/google-subcalendar-big-bang-runbook.md`).
> It splits pre-rename migrations from post-cutover repairs; an unbounded
> pre-rename `migrate up` is no longer safe.

How to run, verify, and — later — cut over the calendar-owned event migration
from plan packet `02`. Read the whole page before touching production.

Two forward migrations are involved:

1. `calendar-record-migration` — reshapes the `calendar` collection to the
   strict record contract in place (preserving every `_id` and visibility
   preference) and creates each user's Compass-local calendar.
2. `event-record-backfill` — rebuilds the inactive `event_new` collection from
   the legacy `event` collection using the deterministic transform, then
   verifies source/destination equivalence.

Neither migration touches the legacy `event` collection, and nothing starts
reading `event_new` until the separate runtime-cutover release. Running these
early is safe; the app keeps serving from legacy data.

## Rollout strategy (sub-calendar v1)

The v1 rollout is staging-first (decision A36 in the project's
[master doc](https://github.com/SwitchbackTech/compass-calendar/blob/90696e1dd9b279f7f1c56be0cef93b8b9c5787fe/team/archive/google-subcalendar-project/master-doc.md),
archived after v1 shipped to production — see `compass-calendar-internal/projects/google-subcalendars/master-doc.md`):

1. **Staging cuts over now.** Run the full procedure below (migrate → verify →
   pause → rename → deploy) against staging when the runtime-cutover release
   merges. Merges to `main` auto-deploy staging, so every subsequent v1 packet
   lands there continuously.
2. **Production stays on the pre-cutover release** the whole time. The
   `Deploy Production` workflow is manual (`workflow_dispatch`) — do not run
   it while v1 work is in flight. Production keeps writing legacy `event`
   data; that is fine, because the backfill is rerunnable and the final
   production migration run happens inside the production cutover window.
3. **Production cuts over once, at the end**: after every packet is merged
   and the plan `09` verification gates pass on staging, execute this runbook
   against production a single time, then run the `Deploy Production` action.
   That is the entire production rollout.

Dev databases follow staging: run the migrations + rename locally (or wipe the
dev database) as soon as you work on a post-cutover branch.

## Preflight

1. **Back up first.** Follow [Back up & restore](./backup-and-restore.md) in
   full. The calendar migration rewrites calendar rows in place — the backup is
   its only rollback.
2. **Disk space.** The backfill writes a full copy of the event collection.
   Confirm free space of at least 2× `db.event.totalSize()`.
3. **Quiet period.** The migrations tolerate concurrent writes (the app still
   writes legacy shapes), but run them at low traffic so the final
   verification scan isn't racing fresh edits.
4. **Check what's pending:**

   ```bash
   bun run cli migrate pending
   ```

   The migration runner reads the Mongo connection from your config file; set
   `COMPASS_CONFIG_FILE=~/compass/compass.yaml` when running outside the dev
   repo. On a Docker install the Mongo port is not published to the host, so
   run the CLI from a machine/container that can reach the compose network.

## Run

```bash
bun run cli migrate up
```

Expected behavior:

- The calendar migration logs how many rows were reshaped and how many local
  calendars were created. Any unconvertible calendar row aborts the whole
  transaction with a summary of `{ id, reason }` pairs — nothing is half
  migrated.
- The backfill logs per-run counts: attempted, inserted, failed, the number of
  legacy someday events **excluded** (`excludedSomeday`), the time-zone
  derivation tally (`calendar` vs `utcFallback`), and the legacy `allDayOrder`
  audit count. Event titles and descriptions never appear in logs.
- **Someday events are intentionally not migrated.** The Someday feature has
  been removed; legacy `isSomeday` events have no destination schedule, so the
  backfill counts them (`excludedSomeday`) and skips them rather than writing
  them into `event_new`. They remain in the legacy `event` collection (your
  backup / rollback source) until the cutover renames it aside.
- The backfill is **fail-closed**: any transform failure, duplicate Google
  event id, or verification mismatch makes the migration throw with a compact
  summary. The legacy collection is untouched either way. Fix the reported
  rows (or file the fixture as a bug), then rerun.
- Reruns are safe and convergent: the backfill clears and rebuilds the
  inactive destination from scratch, and the calendar migration passes over
  already-migrated rows.

## Verify

Verification runs automatically at the end of the backfill and rechecks:

- total and per-user event counts, and per-category counts
  (timed / all-day / series / occurrence);
- the excluded-someday count (`excludedSomedayCount`) reported explicitly, and
  reconciled against the backfill's own tally — the two must agree or the
  migration throws;
- the count reconciliation `legacyTransformable − excludedSomeday ==
  destinationTotal` (someday events are the only deliberate, accounted-for
  shortfall — any other gap fails closed);
- no orphan `seriesId` or `calendarId` references;
- no duplicate provider event ids per calendar;
- a deterministic content hash of every behavior-bearing field, source vs
  destination.

Cutover data policy (confirmed on staging, applies to production too): the
backfill fail-closes on rows the strict contracts cannot represent, and the
approved treatment is deletion, because each class is recoverable from its
source of truth or unreachable: zero-duration timed Google events
(`start == end`; re-importable from Google, though Compass will count them
`invalid` and not model them), Google events owned by users with no calendar
row (re-imported on that user's next sign-in), duplicate `gEventId` copies
(keep the original, strip the bogus id), and events owned by deleted user
accounts (unreachable). Legacy **someday** events are a separate, deliberate
exclusion (not a fail-close): they are counted, left in the legacy collection,
and removed from active data by the cutover rename below. Take the backup
first; it preserves everything, including someday events — that operational
backup is the only recovery path for someday data (there is no export or
recovery command).

A successful run ends with the verification summary. If you need to re-check
later without re-migrating, the same checks are exposed as
`verifyEventMigration` in
`packages/scripts/src/common/migration-support/event-migration.verify.ts`.

## Cutover (performed with the runtime-cutover release, not now)

The cutover is a short, planned write pause. Do not improvise it outside a
release window.

1. Stop the backend so no writes land mid-rename:

   ```bash
   COMPOSE_PROFILES=selfhosted docker compose stop backend
   ```

2. Rerun `bun run cli migrate up` (idempotent) so the destination includes
   every write made since the last run, and confirm the verification summary.
3. Rename collections so validators and indexes travel with the data
   (`prod_calendar` is the production database name):

   ```javascript
   // mongosh, e.g.: docker compose exec mongo mongosh -u ... -p ...
   use prod_calendar;
   db.event.renameCollection("event_legacy_v1");
   db.event_new.renameCollection("event");
   ```

4. Deploy the runtime-cutover app version and start the backend.
5. Smoke-test: sign in, load a week with events, create and delete a test
   event.

After the rename, the active `event` collection is the former `event_new`,
which never held someday records — so active Mongo data is Someday-free the
moment the cutover completes. The excluded someday events live only in
`event_legacy_v1`.

Keep `event_legacy_v1` — it is the rollback source (and the only remaining copy
of the someday events). Do not drop it in v1.

## Rollback after cutover

Rolling back **abandons every write made since the cutover**. That loss window
is the accepted trade for skipping dual-writes; keep it short by rolling back
promptly or not at all.

1. Stop the backend.
2. Dump the new collection first so post-cutover writes stay recoverable by
   hand:

   ```bash
   mongodump --db prod_calendar --collection event --out /tmp/post-cutover-dump
   ```

3. Rename back and redeploy the previous app version:

   ```javascript
   use prod_calendar;
   db.event.renameCollection("event_new");
   db.event_legacy_v1.renameCollection("event");
   ```

4. Start the backend and verify legacy events are readable.

## Notes

- Executed 2025 migrations (`new-events-collection`,
  `migrate-events-to-new-events-collection`) stay recorded and untouched; the
  backfill supersedes their output by rebuilding the destination.
- `allDayOrder` is audited (count logged) and intentionally not carried into
  the new schema — no production code reads it.
- Dev databases use the `_dev.` collection prefix; the commands above show
  production names.
- Priority removal now has an ordered pair of post-cutover migrations.
  `event-priority-schema-repair` (`2026.07.13T11.59.00`) reapplies the current
  strict `EventRecordSchema` to the active final `event` collection and removes
  stale `priority` fields. It must run before `priority-data-cleanup`
  (`2026.07.14T10.00.00`), which also drops the orphaned standalone `priority`
  collection. Run this pair only after `event_new` has become the active
  `event`; before the rename, `event` is legacy-shaped. Both `down()` methods
  are non-destructive no-ops, so rollback is from backup.
