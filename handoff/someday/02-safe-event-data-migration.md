# 02 — Build a safe event data migration

## Goal

Create a bounded, idempotent, fail-closed backfill from legacy `event` data to
the final calendar-owned schema without activating the new collection yet.

Depends on: `01-domain-contracts.md`.

## Non-negotiable migration properties

- Never edit the already-executed 2025 migration files.
- Never delete or clear the legacy `event` collection.
- Never log-and-skip a malformed event and still report success.
- Preserve `_id`, someday ordering, all-day/someday semantics, recurrence links,
  timestamps, provider ids, and local-origin events while converting them into
  the strict discriminated contracts from `01`.
- Audit legacy `allDayOrder` values and record their count, then retire the
  field; repository search found no production reader, so it is not a behavior
  that belongs in the final contract.
- Use bounded batches; the migration must not hold all events in memory.
- A rerun must converge without duplicate rows.

## Primary code anchors

- `packages/scripts/src/migrations/2025.10.18T19.43.00.new-events-collection.ts`
- `packages/scripts/src/migrations/2025.10.18T20.01.14.migrate-events-to-new-events-collection.ts`
- `packages/scripts/src/common/zod-to-mongo-schema.ts`
- `packages/scripts/src/commands/migrate.ts`
- `packages/backend/src/common/services/mongo.service.ts`
- `packages/backend/src/common/constants/collections.ts`

## Calendar assignment rules

1. Someday or unsynced Compass-local event → user's Compass-local calendar.
2. Legacy Google event → user's primary Google calendar. This is safe because
   legacy Compass imported only the primary calendar.
3. Scheduled Compass event for a Google-connected user → active primary writable
   Google calendar, matching current outbound behavior.
4. Scheduled Compass event without a writable Google calendar → Compass-local
   calendar.
5. Missing/ambiguous ownership is a preflight error, not a skipped record.

## Implementation steps

1. Add a pure legacy-to-v2 transform module under `packages/scripts/src/common/`
   with no database calls. Return typed success or a structured reason. It must
   map legacy flags/dates/order fields into exactly one schedule variant,
   recurrence optionals into exactly one recurrence variant, nullable text into
   required details content, and top-level Google ids into one external
   reference.
2. Add a forward migration after the 2025 files which:
   - ensures every user has a Compass-local calendar;
   - applies the final validator to `event_new` using `collMod`, creating the
     collection only when absent;
   - replaces obsolete indexes with the final index set;
   - scans legacy events using `MONGO_BATCH_SIZE`;
   - bulk-upserts destination rows by `_id` with `ordered: false`;
   - resolves recurrence bases in a bounded lookup/cache;
   - records attempted, inserted, updated, and failed counts.
3. Add required indexes for calendar/date range, calendar/someday/order,
   recurrence base references, and provider event ids. Use a partial unique
   Google event-id index scoped by calendar. Calendar indexes include provider
   identity and active/visible user queries.
4. Add a verification command/helper that compares source and destination:
   - total ids and per-user counts;
   - timed/all-day/someday/recurring category counts;
   - orphan calendar/base references;
   - duplicate provider ids;
   - a deterministic projection hash for behavior-bearing fields.
5. Make the migration throw when any transform fails or verification differs.
   Store a compact failure summary; do not print event descriptions/titles.
6. Make `down` an explicitly non-destructive no-op. Rollback switches back to
   the untouched legacy collection.
7. Add a production runbook with disk-space preflight, backup, expected logs,
   verification, cutover pause, and reverse procedure.

## Edge-case fixtures

- User with no Google connection or calendar rows.
- User with multiple Google calendars and a non-first primary calendar.
- Empty title/description, nullable legacy description, and missing timestamps.
- Date-only all-day event around DST and a multi-day all-day event, both with
  exclusive ends after conversion.
- Someday ordering and zero-valued order; legacy `allDayOrder` audit evidence.
- Recurrence instance encountered before its base; missing base must fail.
- Google recurring metadata and Compass-local recurring series.
- Duplicate legacy Google ids and invalid ObjectIds.
- Migration interruption after one batch, followed by a rerun.

## Verification

- Focused pure-transform tests.
- `bun test:scripts` integration tests with fresh, partial, rerun, empty, and
  malformed databases.
- A generated production-shaped fixture large enough to prove memory stays
  approximately flat across batches.
- `bun type-check`, `bun lint`, and `bun run verify`.

## Exit criteria

- [ ] Destination validation and indexes match the final schema.
- [ ] Backfill is idempotent, bounded, and fails on every data-loss condition.
- [ ] Verification proves source/destination behavioral equivalence.
- [ ] The legacy collection is untouched and rollback is documented.

Suggested commit: `feat(scripts): harden calendar event migration`
