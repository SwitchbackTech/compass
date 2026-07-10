# 02 — Build a safe event data migration

## Goal

Create a bounded, idempotent, fail-closed backfill from legacy `event` data to
the final calendar-owned schema without activating the new collection yet, and
migrate the existing `calendar` collection to the final record shape (A32) —
no other packet owns the calendar side.

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

## Deterministic transform rules

The pure transform must encode these derivations explicitly; each is a tested
rule, not an implementation choice left to the agent:

- Schedule kind: `isSomeday` → someday; else `isAllDay` (or date-only strings)
  → allDay; else timed. A flag/date-shape mismatch (timed flag with date-only
  strings, all-day flag with instants) is a preflight failure.
- Timed `timeZone` (A26): Google event → its calendar's stored time zone; else
  the user's primary Google calendar time zone; else `"UTC"`. Record a count
  per derivation source. Legacy rows store only an offset string; today's
  mapper guesses the server zone, so this is the first honest value.
- All-day exclusive end: `endDate == startDate` → end becomes start + 1 day
  (the current web normalizes this at create, but old rows and IndexedDB demo
  rows persist the same-date form); `endDate < startDate` → preflight failure.
- Someday period and anchor: span of more than 7 days → `month`, else `week`
  (mirrors `getSomedayEventCategory`); `anchorDate` = legacy `startDate`.
- Someday `sortOrder`: missing legacy `order` values (the backend never set
  them; see issue #512) are assigned deterministically by `startDate` then
  `_id` within each period bucket, after existing `order` values, and counted.
- Text: missing `title` → `""`; `null`/missing `description` → `""`.
- Recurrence: `rule` only → series; `eventId` only → occurrence; both/empty →
  preflight failure.
- Provider identity: top-level `gEventId`/`gRecurringEventId` → one
  `externalReference`; legacy `origin` is dropped (A34) after the audit records
  its value distribution.

## Implementation steps

1. Add a pure legacy-to-v2 transform module under `packages/scripts/src/common/`
   with no database calls. Return typed success or a structured reason. It must
   implement the deterministic transform rules above: legacy flags/dates/order
   fields into exactly one schedule variant, recurrence optionals into exactly
   one recurrence variant, nullable text into required details content, and
   top-level Google ids into one external reference.
2. Add a calendar-collection forward migration (A32) that runs before the event
   backfill:
   - renames/reshapes existing rows to `CalendarRecord`: `user` → `userId`
     (ObjectId), `selected` → `isVisible`, `primary` → `isPrimary`, `color` →
     `foregroundColor`, `metadata` → `source` (provider, provider calendar id,
     etag), and adds `isActive: true` plus timestamps;
   - creates every user's Compass-local calendar;
   - replaces the calendar validator and indexes with the final set, including
     the partial unique one-local-calendar-per-user and
     one-primary-Google-calendar-per-user indexes;
   - preserves each calendar's existing `_id` so event references stay valid.
3. Add the event forward migration after the 2025 files which:
   - applies the final validator to `event_new` using `collMod`, creating the
     collection only when absent (note: refinements and `zObjectId` transforms
     do not survive into `$jsonSchema`; the validator enforces structure only,
     per `01a`);
   - replaces obsolete indexes with the final index set;
   - scans legacy events using `MONGO_BATCH_SIZE`;
   - bulk-upserts destination rows by `_id` with `ordered: false`;
   - resolves recurrence bases in a bounded lookup/cache;
   - records attempted, inserted, updated, and failed counts.
4. Add required indexes for calendar/date range, calendar/someday/order,
   recurrence base references, and provider event ids. Use a partial unique
   Google event-id index scoped by calendar. Calendar indexes include provider
   identity and active/visible user queries.
5. Add a verification command/helper that compares source and destination:
   - total ids and per-user counts;
   - timed/all-day/someday/recurring category counts;
   - orphan calendar/base references;
   - duplicate provider ids;
   - a deterministic projection hash for behavior-bearing fields.
6. Make the migration throw when any transform fails or verification differs.
   Store a compact failure summary; do not print event descriptions/titles.
7. Make `down` an explicitly non-destructive no-op. Rollback switches back to
   the untouched legacy collection.
8. Add a production runbook with disk-space preflight, backup, expected logs,
   verification, the exact cutover procedure (A31: pause writes, rerun the
   idempotent backfill/verification, rename `event` to a legacy archive name
   and `event_new` to `event` so validators and indexes travel and the
   `Collections` constants stay stable, resume), and the reverse procedure.
   State the accepted loss window explicitly: rolling back after the cutover
   abandons writes made since it; dump the new collection before rolling back
   so those writes are recoverable by hand.

## Edge-case fixtures

- User with no Google connection or calendar rows.
- User with multiple Google calendars and a non-first primary calendar.
- Empty title/description, nullable legacy description, and missing timestamps.
- Date-only all-day event around DST and a multi-day all-day event, both with
  exclusive ends after conversion.
- Someday ordering and zero-valued order; someday events with missing `order`
  (deterministic assignment); legacy `allDayOrder` audit evidence.
- Single-day all-day rows persisted with `endDate == startDate` (normalize to
  exclusive) and `endDate < startDate` (preflight failure).
- Timed events exercising every `timeZone` derivation source: Google calendar
  zone, user primary-calendar zone, and the UTC fallback.
- Calendar rows: field renames with preserved `_id`s, preserved visibility
  preferences, local-calendar creation, and the partial unique index
  invariants.
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
- [ ] The calendar collection matches `CalendarRecord` with preserved ids and
      preferences, and every user has one local calendar.
- [ ] Backfill is idempotent, bounded, and fails on every data-loss condition.
- [ ] Verification proves source/destination behavioral equivalence.
- [ ] The legacy collection is untouched and rollback is documented.

Suggested commit: `feat(scripts): harden calendar event migration`
