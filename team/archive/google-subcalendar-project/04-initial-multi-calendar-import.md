# 04 — Import all eligible Google calendars

## Goal

Implement the requirements archived from #553 by replacing the primary-only
initialization path with a bounded, resumable import of every eligible Google
calendar and its events.

Depends on: `03-event-runtime-cutover.md`.

## Current gaps

- `getCalendarsToSync()` filters the CalendarList down to the primary entry.
- `GCalService.getCalendarlist()` assumes every response has a final sync token
  and therefore does not correctly expose multi-page results.
- `importFull()` uses unbounded `Promise.all` across calendars and opens a Mongo
  transaction around network work without consistently passing its session.
- Per-event `Promise.allSettled` results can hide failed event imports.

## Primary code anchors

- `packages/backend/src/sync/services/init/google-sync-init.ts`
- `packages/backend/src/common/services/gcal/gcal.service.ts`
- `packages/backend/src/calendar/services/calendar.service.ts`
- `packages/backend/src/sync/services/import/google-import.service.ts`
- `packages/backend/src/sync/services/google-sync/google-sync.service.ts`
- `packages/backend/src/sync/services/records/sync-records.repository.ts`

## Implementation steps

0. [x] Prerequisite pulled forward from `07` (A30), because a 25-calendar
   fan-out without it hits rate limits and 10-minute channels cannot survive
   multi-calendar renewal churn:
   - introduce the small Google request context (authenticated client, stable
     Compass user id as `quotaUser`, retry policy) and require it in every
     GCalService method;
   - centralize retry classification and truncated exponential backoff with
     jitter for quota/rate-limit and transient 5xx/network failures;
   - request seven-day channel expirations, persist Google's returned
     expiration, and keep short expirations a dev/test override.
     `07` then owns only inspection, repair, the lease, and coverage tests.
   Shipped in PR #2036 (`GoogleRequestContext`, `withGoogleRetry`,
   `CHANNEL_EXPIRATION_MIN` default raised to 10080 minutes / 7 days).
1. [x] Replace the single-page helper with a CalendarList page generator that
   preserves the original request parameters, follows `nextPageToken`, and
   returns `nextSyncToken` only from the final page. Shipped in PR #2038.
2. [x] Filter only `deleted` or `hidden` entries. Keep readers/free-busy
   readers. Deduplicate by Google calendar id, assert one primary calendar at
   most, and preserve Google's intentionally redacted private-event details.
   Shipped in PR #2038.
3. [x] Reconcile calendars with bulk upserts keyed by user/provider/provider
   id. Preserve existing Compass `isVisible`; use Google's `selected` only to
   seed it in `$setOnInsert`. Mark stale Google calendars inactive only after
   a complete list is available; never delete their preference/identity row.
   Already implemented generically in `calendar.service.ts` prior to this
   packet; confirmed correct once PR #2038 supplied the full eligible list.
4. [x] For owner/writer/reader calendars, import Events with the final Compass
   calendar `_id` so every event is correctly owned and persist an Events sync
   token per calendar. For `freeBusyReader`, persist only calendar metadata;
   availability is fetched through the bounded range-query contract in `01`,
   never stored as synthetic events. Persist one CalendarList sync token per
   user. Shipped in PR #2040.
5. [x] Use the existing concurrency-limiter utility with a small configurable
   calendar concurrency (start at 4). Bound recurring-instance expansion too;
   do not replace rate control with fixed sleeps. Shipped in PR #2040
   (recurring-instance expansion confirmed already page-bounded via
   `getBaseRecurringEventInstances`; no separate limiter needed there).
6. [x] Make each calendar resumable with its page token. A failed calendar
   reports failure and retains progress; successful calendars need not be
   reimported on retry. Shipped in PR #2040.
7. [x] Remove the outer transaction around Google network work. Commit each
   event batch and its resumable progress together; a final sync token
   becomes durable only after the full calendar succeeds. Shipped in PR #2040
   (also fixed a pre-existing bug: `importAllEvents` computed but never
   persisted its final `nextSyncToken`).
8. [x] Treat rejected event work as an import failure with a structured
   summary. Do not advance a final sync token past unpersisted changes.
   Shipped in PR #2040.
9. [x] Start the CalendarList watch and each event-capable calendar's Events
   watch only after the matching final sync token is durable. Do not create
   Events watches for `freeBusyReader` calendars. Watch failure marks sync
   attention but does not erase successfully imported events. Shipped in PR
   #2043.
10. [x] Publish accurate `eventsCount`/`calendarsCount` and per-calendar
    structured logs without titles, Google ids, tokens, or user emails.
    Shipped in PR #2043 (scoped to sync/calendar/gcal/event log paths; a
    known remaining leak in `google-import.service.ts`'s existing log lines
    was flagged, not fixed, since that file was out of this step's scope).
11. [x] Update sync/import docs to distinguish eligible, active, visible,
    writable, and watched calendars. Added to
    `docs/Features/google-sync-and-sse-flow.md`.

## Tests

- 0, 1, 25, and paginated calendar lists; primary is not the first item.
- Hidden/deleted filtered; Google-unselected and read-only calendars imported.
- Reader-private events store explicit busy content with no fabricated title or
  description. `freeBusyReader` calendars store no events; bounded
  `freeBusy.query` responses render read-only periods without synthetic ids.
- Hidden/removed then re-added calendar reuses its Compass id and prior
  visibility preference.
- Duplicate id, two primaries, missing optional metadata, and calendar removed
  during pagination.
- Empty, large, recurring-heavy, and partially failing calendars.
- Retry after a page failure; sync token never advances prematurely.
- Concurrency never exceeds its configured bound.
- A rate-limited (403/429) page retries with backoff through the shared policy
  and the import still converges.
- Watch start occurs after token persistence and includes every event-capable
  imported calendar plus exactly one CalendarList watch.
- Revoked token and Google 410 paths preserve Compass-local data.

## Exit criteria

- [x] Initial sync imports all and only eligible calendars.
- [x] Each imported event references the correct Compass calendar.
- [x] Pagination, retry, concurrency, and partial failure are deterministic.
- [x] Every archived #553 acceptance criterion and its performance guidance is
      covered by implementation and test evidence (all eligible calendars
      import with tokens, resume behavior, scale limits at 25 calendars, and
      partial-failure tests — `00-project-ledger.md`'s summary of #553).

Suggested commit: `feat(backend): import all google calendars`
