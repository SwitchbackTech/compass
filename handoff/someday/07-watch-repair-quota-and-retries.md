# 07 — Repair watches and control Google API pressure

## Goal

Implement the requirements archived from #1722 and #727 with one cheap health
inspection and one idempotent repair coordinator, and verify the request
context, retry policy, and channel-expiration fix that plan `04` step 0 pulled
forward (A30) cover every Google call family.

Depends on: `06-calendar-list-sync-and-watch-routing.md`. The request
context/retry/expiration work itself lands in `04`; this packet extends and
proves it, and owns inspection/repair/lease.

Scope correction (A33): Google attributes per-user quota to the authenticated
OAuth user automatically; `quotaUser` is required guidance only for
domain-wide-delegation service accounts. Keep supplying it through the request
context because it is one field and satisfies archived #727, but it is not a
release gate.

Data-safety correction (A29): the maintenance planner currently reacts to
`invalid_grant` by calling `deleteCompassDataForUser`
(`google-watch-maintenance.planner.ts:95-97`), which deletes priorities,
calendars, ALL events, watches, sync records, and the user document. This
packet replaces that path with the same prune-and-notify used interactively
(`pruneGoogleData`), which preserves Compass-local data.

## Existing work to reuse carefully

Remote commits `61c3bc0db` and `b572a3ca4` contain a watch-state inspector,
repair service, cooldown, and tests. Port concepts/file-level changes onto the
current branch. Do not merge/cherry-pick the divergent branch wholesale, and
correct its process-local lock and single-calendar assumptions.

Closed PR #1654 demonstrates quota/backoff intent but uses fixed sleeps and
limits retries to one method. Replace that with a shared policy.

## Primary code anchors

- `packages/backend/src/sync/services/watch/google-watch-state.ts`
- `packages/backend/src/sync/services/watch/google-watch-maintenance.service.ts`
- `packages/backend/src/sync/services/watch/google-watch-maintenance.planner.ts`
- `packages/backend/src/sync/services/google-sync/google-sync.health.ts`
- `packages/backend/src/sync/services/google-sync/google-sync.service.ts`
- `packages/backend/src/common/services/gcal/gcal.service.ts`
- `packages/backend/src/events/controllers/events.controller.ts`
- `docs/Self-Hosting/google-calendar.md`

## Implementation steps

1. Build `inspectGoogleWatchState(userId)` from Compass-owned state only. It
   reports not-applicable, healthy, refresh-required, repair-required, or
   full-repair-required and classifies missing, expired, expiring, duplicate,
   stale, and incomplete watches. Read stored watches with a relaxed
   projection, not `WatchSchema.parse`: `ExpirationDateSchema` rejects past
   dates, so the expired watches this inspector exists to find cannot pass the
   write-side schema. Also correct the timing pair: the renew-soon buffer is 3
   days while the shipped channel TTL is 10 minutes, so today every live watch
   is permanently "expiring."
2. Expected watches are one CalendarList watch plus one Events watch for every
   imported active, event-capable Google calendar with a usable sync token.
   `freeBusyReader` calendars are excluded because availability has no Events
   watch or incremental token. Visibility does not change the expected set.
3. Add a Mongo-backed per-user repair lease and persisted cooldown. Acquire with
   one atomic update and an expiry so multiple backend processes/tabs cannot
   duplicate repair; allow recovery from a crashed lease holder.
4. Implement one repair coordinator:
   - healthy → no Google calls;
   - expiring → replace only expiring watches;
   - missing/expired/duplicate/stale → rebuild the necessary watch set and run
     incremental catch-up;
   - missing/invalid sync tokens → start existing full repair;
   - revoked credentials → prune-and-notify (`pruneGoogleData`) from every
     entry point, replacing the maintenance planner's account-deleting
     `deleteCompassDataForUser` path (A29).
5. Invoke the coordinator from scheduled maintenance and defensively after SSE
   subscription/user sync start. The latter runs in background and relies on
   lease/cooldown; metadata reads stay side-effect free.
6. Verify the request context introduced in `04` step 0 (authenticated client,
   canonical Compass user id as `quotaUser`, retry policy) is required by
   every existing GCalService method so a new call cannot forget it. Do not
   introduce a provider framework around it.
7. Confirm coverage of Events get/list/instances/insert/patch/delete,
   CalendarList list/watch, Events watch, and Channels stop. Remove the
   remaining random quota ids on stop/prune paths.
8. Verify the centralized retry classification from `04` step 0: truncated
   exponential backoff with jitter; retry quota/rate-limit and transient
   5xx/network failures; do not retry invalid grants, permissions, validation,
   or 404 stop results. Respect any supported retry hint and cap
   attempts/elapsed time.
9. Keep import concurrency bounded in addition to retries; retries are not flow
   control. Log aggregate attempt/outcome/duration without tokens or payloads.
10. Update health, self-hosting, monitoring, and local webhook docs. State that
    Google push delivery is not guaranteed and incremental catch-up is the
    source of convergence.
11. Verify the seven-day channel expiration from `04` step 0 end to end:
    persist Google's returned expiration, refresh from the returned value with
    a safe buffer, and keep short expirations an explicit dev/test override.

## Tests

- Every inspection state for 0/1/many calendars.
- Two concurrent repair calls across simulated processes; one lease winner.
- Expired lease recovery and cooldown across restart.
- Idempotent repair, no duplicate active watches, stale cleanup, and incremental
  catch-up after a missed notification.
- Incremental token failure falls back to full repair; revoked access prunes
  only Google provider data.
- `invalid_grant` raised inside scheduled maintenance prunes Google data and
  notifies; it never deletes Compass-local events, calendars, or the user
  (regression test for the removed `deleteCompassDataForUser` path).
- Healthy checks make zero Google calls.
- Table-driven assertion that every GCalService operation includes the same
  `quotaUser`.
- Fake-timer retry tests for 403/429 retryable reasons, 5xx, network errors,
  invalid grant, permission denied, max attempts, and jitter bounds.

## Exit criteria

- [x] Scheduled and user-start paths call one repair coordinator. Shipped in
      PR #2059: scheduled maintenance (active users), SSE subscribe, and the
      sync-start ignored paths all call
      `googleWatchRepairService.repairGoogleWatchesForUser`.
- [x] Healthy checks are cheap and repairs are multi-process idempotent.
      PR #2058 (inspector: zero Google calls, Compass state only) and
      PR #2059 (Mongo lease on the sync doc with crashed-holder expiry
      recovery plus a persisted five-minute cooldown; healthy outcomes never
      touch the lease).
- [x] All Google requests use stable user quota attribution. Already true
      entering this packet (packet 04's request context); PR #2060 adds the
      table-driven proof across every GCalService method with a reflection
      guard so a new method must join the table. Step 7's "remaining random
      quota ids on stop/prune paths" were already gone — verification only.
- [x] Retry/concurrency behavior is centralized, bounded, and observable.
      PR #2060: Retry-After hints honored (clamped to the 30s cap),
      structured attempts/elapsed/outcome logging on any retried call;
      import concurrency bounds pre-existing (4 calendars per user, 5 users
      in maintenance).
- [x] Every archived #1722 and #727 requirement has matching implementation
      and test evidence. PRs #2058, #2059, #2060.

Corrections discovered while implementing (recorded in `master-doc.md`):

- Step 1's "the shipped channel TTL is 10 minutes … every live watch is
  permanently 'expiring'" was stale — packet 04 shipped the 7-day
  `CHANNEL_EXPIRATION_MIN` default (A30), so no timing change was needed;
  PR #2060 pins the default and the store-Google's-returned-expiration
  behavior with tests instead.
- The activity gate `hasUpdatedCompassEventRecently` queried legacy
  `user`/`origin` event fields that post-cutover EventRecords never have,
  classifying every user inactive. Replaced by `hasUserBeenActiveSince`
  (`lastSeenAt` touched on SSE (re)connect, or `lastLoggedInAt`) — decision
  A40, PR #2060.
- A29 landed in PR #2059: every revoked-access site funnels through
  `pruneGoogleDataAndNotifyRevoked`; `deleteCompassDataForUser` remains only
  for the account-deletion CLI.

Shipped in PRs #2058, #2059, #2060.

Suggested commit boundaries:

1. `fix(sync): repair google watches idempotently`
2. `fix(gcal): attribute quota and retry transient requests`
