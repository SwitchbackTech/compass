# Google sub-calendar big-bang deployment runbook

Status: **staging validator recovery and full-sync acceptance are complete;
production is locked**.

This is the master operator runbook for landing the work from
[`google-subcalendar-project`](../archive/google-subcalendar-project/master-doc.md)
as one coordinated database and application cutover. It includes the event
collection rename, every post-cutover repair, the removal of `priority`, Google
multi-calendar sync, the calendar-aware runtime, and the release-hardening
acceptance checks.

The current task is staging only. Do not run the production phase until the
staging evidence table in this document is complete and the product owner opens
the production gate.

## Why this runbook supersedes the earlier sequence

The original production plan ran every pending migration before renaming
`event_new` to `event`. That stopped being safe when post-cutover migrations
were added:

- `recurring-series-first-occurrence-repair` operates on the active, final
  `event` schema. Before the rename, production's `event` collection is still
  legacy-shaped, so the repair would no-op and be recorded as complete.
- PR #2101 removed `priority` from `EventRecordSchema`, but staging's active
  Mongo validator still required it. New sync inserts consequently fail with
  Mongo code `121`.
- `priority-data-cleanup` unsets `priority` from whichever collection is named
  `event` when it runs. Under the stale validator, that unset is rejected.

The safe order is therefore:

1. Run only the legacy-to-final calendar migration and inactive event backfill.
2. Verify and rename the collections.
3. Run all post-cutover repairs against the newly active final `event`.
4. Deploy the final runtime and run acceptance.

## Included release surface

The selected release must include all completed packets `01` through `08` and
the automated work from packet `09`, plus these database migrations in order:

| Order | Migration | Runs against |
| --- | --- | --- |
| 1 | `2026.07.10T21.00.00.calendar-record-migration` | live `calendar` |
| 2 | `2026.07.10T21.30.00.event-record-backfill` | legacy `event` → inactive `event_new` |
| rename | `event` → `event_legacy_v1`; `event_new` → `event` | physical collections |
| 3 | `2026.07.13T11.59.00.event-priority-schema-repair` | final active `event` validator and rows |
| 4 | `2026.07.13T12.00.00.recurring-series-first-occurrence-repair` | final active `event` |
| 5 | `2026.07.14T10.00.00.priority-data-cleanup` | active `event` hygiene and orphaned `priority` collection |

The `11.59` timestamp is intentional: the validator must stop requiring
`priority` before the recurring repair inserts rows without that removed field
and before the `10.00` cleanup attempts to unset it.

## Environment state matrix

Confirm physical state before running any write command. Hosted staging and
production processes use the `prod_calendar` database because their runtime
`nodeEnv` is `production`; the environment is selected by `MONGO_URI`, not by a
different database name.

| Environment | Expected state now | Allowed action |
| --- | --- | --- |
| staging-cloud | Already cut over; active `event` uses `calendarId` and may have the stale `priority` validator | Run the staging recovery below |
| staging-selfhosted | Confirm independently; do not assume it matches staging-cloud | Run recovery only if already cut over |
| production | Legacy `event`; no big-bang cutover performed | Read-only preflight only |

For each target, capture these results without event content:

```javascript
use prod_calendar;
db.getCollectionInfos({ name: "event" })[0].options.validator;
db.event.countDocuments({ calendarId: { $exists: true } });
db.event.countDocuments({ user: { $exists: true } });
db.getCollectionInfos({ name: "event_new" }).length;
db.getCollectionInfos({ name: "event_legacy_v1" }).length;
db.migrations.find({}, { name: 1 }).sort({ name: 1 });
```

Stop if the observed shape does not match the matrix. Do not use collection
counts alone to infer which schema is active.

## Phase S0 — staging preparation

Run separately for `staging-cloud` and `staging-selfhosted`; record which target
each command used.

1. Choose the release tag containing the validator repair and this runbook.
2. Confirm its CI, scripts tests, type-check, and lint are green.
3. Prepare a trusted admin checkout at that exact tag and a target-specific
   `compass.yaml`. Never commit the file.
4. Record the currently deployed tag from `/version.json`.
5. Capture the environment-state queries above.
6. Take a backup:
   - staging-cloud: managed Mongo snapshot plus `mongodump` through the trusted
     admin path;
   - staging-selfhosted: the documented Mongo dump/volume procedure.
7. Verify the dump is non-empty and restore at least its metadata into a scratch
   database.
8. Announce the staging maintenance window and identify the operator and
   rollback owner.

## Phase S1 — repair already-cut-over staging

This phase is the only write procedure currently approved.

1. Stop the target staging backend so no sync or event writes race the repair:

   ```bash
   ssh <staging-host> \
     'cd ~/compass && docker compose --project-name compass -f compose.yaml stop backend'
   ```
2. From the release checkout, inspect pending migrations:

   ```bash
   COMPASS_CONFIG_FILE=<target-staging.yaml> bun run cli migrate pending
   ```

3. Confirm the calendar migration and event backfill are already recorded. If
   either is pending while the active `event` is already calendar-owned, stop;
   the ledger and physical state disagree.
4. Confirm the pending list includes
   `2026.07.13T11.59.00.event-priority-schema-repair` before the recurring-series
   repair and `2026.07.14T10.00.00.priority-data-cleanup`.
5. Run the remaining migrations:

   ```bash
   COMPASS_CONFIG_FILE=<target-staging.yaml> bun run cli migrate up
   ```

6. Verify the migration ledger records every pending migration exactly once.
7. Verify the active collection:

   ```javascript
   use prod_calendar;
   const eventInfo = db.getCollectionInfos({ name: "event" })[0];
   eventInfo.options.validationLevel;
   eventInfo.options.validator.$jsonSchema.required;
   eventInfo.options.validator.$jsonSchema.properties.priority;
   db.event.countDocuments({ priority: { $exists: true } });
   db.event.validate({ full: true });
   ```

   Required result: validation is `strict`; `priority` is absent from both the
   required list and properties; the count is zero; collection validation is
   valid.

   The schema repair also removes any active `schedule.kind: "someday"` row
   leaked by an earlier cutover, but fails closed unless every removed `_id` is
   present in `event_legacy_v1`. Someday data remains recoverable only from that
   archive, as established by the event migration runbook.
8. Deploy or rerun **Deploy staging** for the same release tag. This restarts
   the backend and runs the standard environment health check.

## Phase S2 — staging smoke and Google acceptance

Use only designated staging accounts. At minimum:

1. Trigger a full Google resync for the account that reproduced Mongo code
   `121`; it must complete without `Document failed validation`.
2. Make a Google-side add, edit, and delete and confirm each reconciles onto
   the correct Compass calendar.
3. Create, edit, and delete Compass timed and all-day events on a writable
   secondary Google calendar.
4. Confirm recurring-series repair creates no duplicates and does not resurrect
   cancelled Google occurrences.
5. Confirm the backend logs have no Mongo `121`, sync `ERRORED`, fatal, or
   unhandled-rejection entries after the test start time.
6. Run all 12 manual acceptance steps in
   [`09-v1-release-hardening.md`](../archive/google-subcalendar-project/09-v1-release-hardening.md#manual-acceptance-runbook).
7. Let both staging targets run through at least one watch renewal/catch-up
   cycle before closing the staging gate.

## Phase S3 — staging rollback rehearsal

The migrations have non-destructive `down()` methods; rollback is a database
restore, not `migrate down`.

1. Stop the staging backend.
2. Dump the post-repair `event` collection so new staging writes remain
   available for diagnosis.
3. Restore the Phase S0 backup into the staging database.
4. Redeploy the previously recorded staging tag.
5. Verify legacy behavior and record the accepted write-loss window.
6. Repeat Phase S1 and Phase S2. The second forward run must converge cleanly.

Do not perform this rehearsal on production.

## Staging evidence gate

Fill this table with links to logs or internal artifacts that contain no event
content or credentials.

| Evidence | staging-cloud | staging-selfhosted |
| --- | --- | --- |
| Preflight state captured | 2026-07-14: cut over; 50,500 active rows; 9 migration records | 2026-07-14: cut over; 1 active row; 9 migration records |
| Backup restore checked | 2026-07-14: 103,940 documents restored to scratch DB; 0 failures | 2026-07-14: 17 documents restored to scratch DB; 0 failures |
| Validator repair migrated | 2026-07-14, `v1.0.207`: 12 ledger records; strict validator valid; `priority` absent; 50,396 active rows | 2026-07-14, `v1.0.207`: 12 ledger records; strict validator valid; `priority` absent; 0 active rows |
| Google sync code `121` absent | 2026-07-14, `v1.0.211`: designated account full resync passed with 0 invalid rows and no code `121` | Not applicable: no Google account is configured on this target; service health and logs passed |
| 12-step acceptance passed | pending | pending |
| Rollback and second forward run passed | pending | pending |
| Operator/date/release tag | Codex / 2026-07-14 / `v1.0.211` | Codex / 2026-07-14 / `v1.0.211` |

Production remains locked while any cell is pending.

### Recorded staging rehearsal — 2026-07-14

The first `v1.0.205` rehearsal stopped safely before backend restart. It exposed
two pre-existing active-data leaks: 104 cloud and 1 self-hosted Someday rows,
all matched by `_id` in `event_legacy_v1`. It also proved the priority validator
repair must precede the recurring-series repair. Release `v1.0.205` must not be
used for another migration attempt.

The corrective releases were applied in this order:

| Release | Change | Staging evidence |
| --- | --- | --- |
| `v1.0.207` / [PR #2107](https://github.com/SwitchbackTech/compass-calendar/pull/2107) | Put the `11.59` validator repair before recurring repair; remove only archived Someday leaks; restore the final strict schema | Both backups restored into scratch databases with zero failures. Both targets reached 12 migration records, zero `priority` fields, zero active Someday rows, and `db.event.validate({ full: true }).valid === true`. |
| `v1.0.209` / [PR #2109](https://github.com/SwitchbackTech/compass-calendar/pull/2109) | Batch standalone Google event lookup and persistence | The 317-event Holidays calendar improved from about 84 seconds to 1.81 seconds. |
| `v1.0.210` / [PR #2110](https://github.com/SwitchbackTech/compass-calendar/pull/2110) | Stream and batch recurring Google instances | The 143-event Family calendar improved from 56.69 seconds to 2.59 seconds; the 2,745-event primary calendar completed in 17.81 seconds instead of about 17 minutes 21 seconds. All three reported zero invalid events. |
| `v1.0.211` / [PR #2111](https://github.com/SwitchbackTech/compass-calendar/pull/2111) | Record calendars for which Google explicitly does not support push watches, and exclude only those calendars from watch-health expectations | A fresh forced resync completed Holidays in 2.64 seconds, Family in 2.68 seconds, and primary in 16.98 seconds. It saved 317, 143, and 2,742 events respectively, with zero invalid rows and no Mongo code `121`. The Holidays watch rejection was informational, required watches initialized, and the signed-in UI settled to `Up-to-date`. |

Both staging deployments ran `v1.0.211` with healthy backend, Mongo, and
SuperTokens containers after acceptance. Cloud logs contained no `Document
failed validation`, code `121`, `Re-sync failed`, `ERRORED`, fatal, or unhandled
entries after the acceptance start time. Self-hosted staging has no configured
Google account, so direct Google acceptance there is not applicable; do not
misread that as evidence for a production Google sync.

Production remains locked because the complete packet `09` manual acceptance,
watch-renewal soak, and rollback/second-forward rehearsal are still pending.
Release `v1.0.205` must not be used for another migration attempt.

## Future Phase P — production big-bang cutover

This section is a reference plan, not current authorization.

### Production go/no-go

The operator-facing version of this gate — with tag/backup/window/rollback-owner
boxes to tick, an abort rule, and a sign-off block — is
[`prod-go-no-go-checklist.md`](./prod-go-no-go-checklist.md). Fill that in; the
bullets below are its summary.

- Every staging evidence cell above is complete.
- Packet `09` is marked complete in the project master plan.
- The exact release tag passed staging and its images exist.
- Production still has legacy `event`, and the migration ledger matches that
  state.
- A managed snapshot and verified `mongodump` exist.
- The maintenance window, rollback owner, communications, and previous release
  tag are recorded.

### Production execution

1. Stop the production backend and verify writes have ceased.
2. Run only through the inactive final-schema backfill:

   ```bash
   COMPASS_CONFIG_FILE=<prod.yaml> bun run cli migrate up \
     --to 2026.07.10T21.30.00.event-record-backfill
   ```

3. Require the backfill verification summary to pass. Verify indexes, category
   counts, hashes, excluded someday count, and disk headroom.
4. Rename the collections:

   ```javascript
   use prod_calendar;
   db.event.renameCollection("event_legacy_v1");
   db.event_new.renameCollection("event");
   ```

5. Run every post-cutover repair against the newly active collection:

   ```bash
   COMPASS_CONFIG_FILE=<prod.yaml> bun run cli migrate up
   ```

6. Repeat the strict-validator checks from Phase S1. Keep
   `event_legacy_v1`; it is the rollback source.
7. Deploy the selected tag with **Deploy production**, resume service, and run
   the Phase S2 smoke plus production health checks.

If the installed Umzug CLI does not accept `up --to`, stop during rehearsal and
resolve the exact supported syntax. Do not replace the boundary with an
unbounded pre-rename `migrate up`.

### Production rollback

1. Stop the backend and dump the post-cutover `event` collection.
2. Rename `event` back to `event_new` and `event_legacy_v1` back to `event`.
3. Redeploy the recorded pre-cutover tag.
4. Restore `calendar` from the pre-cutover backup if its in-place migration is
   implicated.
5. Preserve the dumps and migration logs for reconciliation; do not drop either
   event collection.

Rollback abandons writes made after cutover from the active application view;
the post-cutover dump keeps them available for manual recovery.

## Source documents

- Project source of truth:
  [`master-doc.md`](../archive/google-subcalendar-project/master-doc.md)
- Release gate and full acceptance:
  [`09-v1-release-hardening.md`](../archive/google-subcalendar-project/09-v1-release-hardening.md)
- Migration details:
  [`event-migration-runbook.md`](../../docs/self-hosting/event-migration-runbook.md)
- Backup and physical rename:
  [`backup-and-restore.md`](../../docs/self-hosting/backup-and-restore.md)
- Historical production plan:
  [`prod-cutover-plan-subcalendar-v1.md`](./prod-cutover-plan-subcalendar-v1.md)
- Deployment workflows:
  [`deploy-staging.yml`](../../.github/workflows/deploy-staging.yml),
  [`deploy-production.yml`](../../.github/workflows/deploy-production.yml)
