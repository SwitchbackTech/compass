# 01 — Repair the Google sync lifecycle

_Proposed architect packet, 2026-07-13. Based on the staging investigation at
frontend version `1.0.187` and local source at `c95eeb224`._

## Review status

- [x] Founder approved the implementation scope on 2026-07-13.
- [ ] Fullstack confirms the single-backend-process assumption still matches every
      supported deployment.
- [ ] QA confirms the staging recovery steps are safe for the test account.

This is one correctness repair, intended to ship as one focused PR. It does not
introduce a queue, worker, polling loop, replay log, database lease, heartbeat, or
new dependency.

## Problem statement

The staging account `compasscaltest3@gmail.com` perpetually shows “Syncing…”. The
live metadata response confirms that this is not merely a rendering problem:

```text
sync.importGCal = IMPORTING
sync.incrementalGCalSync = COMPLETED
google.connectionState = IMPORTING
```

Three lifecycle failures combine to make that state permanent:

1. A full import stores `IMPORTING` before deleting/rebuilding Google sync data. A
   backend restart can abandon that stored value without running success/error
   cleanup.
2. Stored `IMPORTING` is treated as proof that work is active. Even `force: true`
   refuses to repair it, so reconnect, watch repair, and the UI cannot recover.
3. The SSE migration can emit `syncing` for an incremental request that is later
   ignored, with no terminal event. The web also lets the transient SSE override
   outrank healthy metadata replayed on reconnect.

The transport itself is healthy: staging had an active EventSource connection and
no malformed/unrecognized SSE messages in the browser console. The defect is in
how backend activity, persisted status, and frontend presentation are reconciled.

## Goals

- A backend restart cannot leave an account permanently `IMPORTING`.
- At most one Google sync operation runs per user in the current backend process.
- Full and incremental sync cannot race each other in that process.
- The backend never emits `syncing` for work it already knows it will ignore.
- Every non-crash path that emits `syncing` emits a terminal `healthy` or
  `attention` message.
- Replayed metadata repairs a stale frontend-only `syncing` override.
- The stuck staging account becomes repairable without a special migration.
- Tests exercise lifecycle sequences, not only individual event helpers.

## Non-goals

- Supporting multiple simultaneously active backend replicas.
- Building a general background-job framework.
- Guaranteeing SSE delivery with message IDs or a replay journal.
- Adding progress percentages, cancellation, or a sync-history UI.
- Redesigning Google watch inspection/maintenance.
- Changing Google event import, paging, retry, or persistence behavior.
- Automatically modifying the staging account as part of the code change.

## Simplicity decision

### Use one small runtime activity registry

Compass already uses an in-memory `Set` to prevent two full imports for one user.
Keep that deployment assumption, but make the state explicit and shared by both
full and incremental sync.

Add one narrow module, tentatively:

```text
packages/backend/src/sync/services/google-sync/google-sync.activity.ts
```

Its complete production API should be approximately:

```ts
tryBeginGoogleSync(userId: string): boolean
endGoogleSync(userId: string): void
isGoogleSyncActive(userId: string): boolean
```

No operation classes, job objects, generic lock abstraction, owner IDs, expiry
fields, or public configuration. The module owns one private `Set<string>`.

### State semantics

| Signal | Meaning after this repair |
| --- | --- |
| Runtime activity registry | Work is executing in this backend process now. This is the concurrency authority. |
| `sync.importGCal` | Durable outcome/recovery marker for the last full import. It is not a lock. |
| `sync.incrementalGCalSync` | Durable outcome/recovery marker for the last sign-in incremental import. It is not a lock. |
| `google.connectionState` | Server-computed UI state using runtime activity plus durable health. |
| SSE `syncStatusChanged` | Prompt notification for an already-connected tab, not durable truth. |
| Web transient override | Short-lived presentation bridge until metadata confirms current truth. |

This removes the circular assumption that `IMPORTING` proves a live task exists.
After a backend restart, the registry is empty. Old `IMPORTING` metadata is then
recognized as abandoned on the next metadata fetch or SSE connection.

### Why not add a Mongo lease now?

A Mongo lease is required if Compass runs multiple backend processes that may serve
the same user concurrently. Current supported Compose deployments run one backend
service instance, and the existing code already relies on process-local exclusion.

A correct distributed lease would need acquisition, expiry, renewal during long
imports, release, crash recovery, observability, and careful interaction with
`stopGoogleCalendarSync`, which deletes Google sync records. That is materially more
system than this bug needs. Record it as the upgrade path if deployment topology
changes; do not partially build it now.

## Implementation plan

### 1. Centralize current activity

Primary files:

- `packages/backend/src/sync/services/google-sync/google-sync.activity.ts` (new)
- `packages/backend/src/sync/services/google-sync/google-sync.service.ts`

Changes:

1. Move the existing `activeFullSyncRestarts` responsibility into the activity
   module.
2. Make both `importLatestGoogleCalendarChanges` and
   `runGoogleCalendarSyncSetup` call `tryBeginGoogleSync` before any start event,
   metadata mutation, Google request, or destructive cleanup.
3. If acquisition fails, return as ignored without publishing `syncing`.
4. Always call `endGoogleSync` from `finally` after successful acquisition.
5. Treat stored `IMPORTING` with a newly acquired runtime slot as abandoned work:
   it may be retried. Treat `COMPLETED` as the existing non-force skip condition.
6. A forced repair proceeds whenever it acquired the runtime slot. “Force” must
   bypass stale persisted status, but never bypass actual current activity.

Expected ordering for work that runs:

```text
acquire runtime activity
  → decide the requested operation may run
  → publish syncing
  → persist IMPORTING
  → perform sync
  → persist COMPLETED or ERRORED
  → publish terminal message
  → release runtime activity
```

Expected ordering for duplicate/ineligible work:

```text
cannot acquire, or durable COMPLETED says non-force work is unnecessary
  → return ignored
  → publish no start and no fake completion
```

Do not retain `IGNORED` as a branch in `notifyImportEnd`; it made an invalid
start/end sequence representable. Use explicit success/failure helpers or a status
union that only contains terminal outcomes.

### 2. Make metadata assessment reflect real activity

Primary files:

- `packages/backend/src/user/services/user-metadata.service.ts`
- `packages/backend/src/user/services/user-metadata.service.test.ts`

Assessment order for a Google-connected user with a refresh token:

1. If `isGoogleSyncActive(userId)`, return `IMPORTING`.
2. If durable full-import metadata is `IMPORTING` but runtime activity is absent,
   return `ATTENTION`—the prior run was abandoned.
3. Preserve the existing `RESTART → ATTENTION` rule.
4. Otherwise compute `HEALTHY` versus `ATTENTION` from sync tokens/watches as today.

This rule also makes replayed metadata accurate during an incremental sync: runtime
activity yields `IMPORTING` even though the full-import status may be `COMPLETED`.

Assessment stays read-only. It must not silently mutate SuperTokens metadata during
a GET or SSE connection. A subsequent successful repair replaces the abandoned
status normally.

### 3. Guarantee terminal notification on handled failures

Primary file:

- `packages/backend/src/sync/services/google-sync/google-sync.service.ts`

Today, failure handlers update metadata before publishing `attention`. If that
update fails, the terminal SSE message is skipped too.

For both full and incremental paths:

1. Log the original sync failure.
2. Attempt to persist `ERRORED` in a nested `try/catch`.
3. Log metadata persistence failure separately.
4. Publish `attention/IMPORT_FAILED` even if metadata persistence failed.
5. Release runtime activity in `finally`.

Do not create a retry framework for metadata writes in this packet. The reconnect
assessment and actual sync health remain the durable recovery path.

Process termination can still prevent a terminal SSE message. That is expected;
the registry + reconnect assessment repair that gap after restart.

### 4. Reconcile the web override with metadata replay

Primary files:

- `packages/web/src/sse/hooks/useGcalSSE.factory.ts`
- `packages/web/src/auth/google/state/google.sync.state.ts`
- `packages/web/src/sse/provider/SSEProvider.interaction.test.tsx`

When `userMetadataChanged` arrives:

1. Store the metadata as today.
2. If the transient override is exactly `syncing` and
   `metadata.google.connectionState !== "IMPORTING"`, clear it.
3. Do not clear the optimistic `repairing` override from metadata replay; a replay
   can race ahead of the repair start, and its SSE terminal path already owns that
   state.

Prefer one semantic helper such as `clearSyncingSyncIndicatorOverride` over
duplicating a get/compare/clear sequence in the hook. Keep the external store; it
is still needed to reflect a start event before refreshed metadata arrives.

Do not add a timeout or polling loop. Reconnect already replays metadata, and
success/failure paths refresh metadata.

### 5. Repair operation naming while touching the helper

Primary files:

- `packages/backend/src/sync/services/google-sync/google-sync.service.ts`
- relevant backend SSE tests

The `importCompleted` contract supports `full`, `incremental`, and `repair`, but the
current mapper turns every non-repair operation into `incremental`. Use typed
operation values end-to-end so:

- initial full import reports `full`;
- sign-in incremental import reports `incremental`;
- forced full repair reports `repair`.

This is a small adjacent correction in the same helper and should not become a
separate abstraction.

## Required regression tests

### Backend service tests

Add focused lifecycle assertions to
`packages/backend/src/sync/services/google-sync/google-sync.service.test.ts`:

- [ ] Completed incremental state: no import work, no `syncing`, no terminal event.
- [ ] Incremental runtime collision: loser emits no SSE state changes.
- [ ] Full/incremental collision: only the winner runs; the loser performs no
      destructive cleanup.
- [ ] Seeded full `IMPORTING` with no runtime activity: forced repair runs.
- [ ] Seeded full `IMPORTING` with no runtime activity: non-force recovery may run.
- [ ] Active full import plus forced request: forced request is ignored; active run
      owns the eventual terminal event.
- [ ] Successful full/incremental runs emit `syncing` then a terminal message in
      order.
- [ ] Sync failure plus metadata-update failure still emits `attention` and releases
      activity.
- [ ] Activity releases after success, ordinary failure, revoked-token handling,
      and cleanup failure.
- [ ] Completion operations are `full`, `incremental`, and `repair` respectively.

Avoid sleep-based concurrency tests. Gate the first promise with a deferred promise,
invoke the competing operation while it is deterministically held, then release it.

### Metadata tests

Add to `packages/backend/src/user/services/user-metadata.service.test.ts`:

- [ ] Runtime activity returns `IMPORTING` regardless of the prior durable outcome.
- [ ] Durable `IMPORTING` without runtime activity returns `ATTENTION`.
- [ ] `RESTART`, revoked credentials, healthy sync, and unhealthy sync retain their
      existing behavior.

Reset the activity registry in test cleanup so files remain isolated. A test-only
reset is acceptable; do not export the underlying `Set`.

### Web interaction tests

Add to `packages/web/src/sse/provider/SSEProvider.interaction.test.tsx`:

- [ ] `syncing` followed by replayed `HEALTHY` metadata clears the override.
- [ ] `syncing` followed by replayed `ATTENTION` metadata clears the override.
- [ ] `syncing` followed by replayed `IMPORTING` metadata remains syncing.
- [ ] `repairing` is not cleared by an early healthy metadata replay.
- [ ] Existing healthy, failure, revoked, and import-completed cases remain green.

### Controller/SSE integration test

Add one end-to-end backend test at the existing stream/controller seam:

- [ ] An ignored import request never sends `syncStatusChanged: syncing`.
- [ ] A real import sends `syncing` and exactly one terminal status to an open SSE
      stream.

Do not add a new E2E test harness solely for this bug; the existing backend SSE
driver and web interaction suite are the correct seams.

## Verification commands

During implementation:

```bash
TZ=UTC bun test:backend --runTestsByPath \
  packages/backend/src/sync/services/google-sync/google-sync.service.test.ts \
  packages/backend/src/user/services/user-metadata.service.test.ts \
  packages/backend/src/sync/controllers/sync.controller.test.ts --runInBand

bun test --cwd packages/web \
  src/sse/provider/SSEProvider.interaction.test.tsx
```

Before handoff:

```bash
bun test:core
bun test:web
TZ=UTC bun test:backend
bun type-check
bun lint
bun run verify
```

Confirm `bun run verify` selected the expected backend/core/web checks; do not treat
its exit code alone as sufficient.

## Staging recovery and acceptance

Deploy the fixed release before changing the stuck account manually.

1. Confirm `/version.json` is the fixed version.
2. Open staging as `compasscaltest3@gmail.com`.
3. Confirm replayed metadata now presents `ATTENTION` rather than perpetual
   `IMPORTING` because no runtime activity exists for the abandoned run.
4. Select “Sync now” once.
5. Observe one `syncStatusChanged: syncing`, followed by `importCompleted` and
   `syncStatusChanged: healthy`, or a single actionable `attention` failure.
6. Reload and confirm the account remains `HEALTHY`/“Up-to-date”.
7. Confirm calendars and events converge without duplicates.
8. Trigger a harmless duplicate import request in a controlled QA session and
   confirm it creates no new syncing indicator.
9. Restart the staging backend during a test-account import, reconnect, and verify
   the account becomes actionable rather than permanently syncing. Only use the
   designated staging test account; do not interrupt another user's import.

If step 3 does not expose the repair action, use a one-time metadata correction for
the staging test account only (`IMPORTING → ERRORED` or `RESTART`) and record why.
That operator action is a fallback, not the application fix.

## Implementation verification — 2026-07-13

- Focused backend lifecycle suites: 48 passed.
- Focused web SSE interaction suite: 10 passed.
- Core suite: 265 passed.
- Type-check: passed.
- Changed sync files: Biome check and `git diff --check` passed.
- Full backend suite: 675 passed; two unrelated calendar-controller assertions
  still expect `ObjectId` where the current controller passes a string.
- Full web suite: 1,314 passed with no assertion failures; the test bootstrap
  reports two existing jsdom CSS parse errors and exits nonzero.
- Repository lint remains blocked by unrelated formatting errors and existing
  warnings outside this packet.
- React Doctor reported no issue in the sync files changed by this packet. Its two
  branch-level findings are in the existing release-notes dialog and day grid.

Staging acceptance remains pending deployment.

## Rollback

The code change has no schema migration and no new persisted fields.

- Application rollback: deploy the prior version.
- No database rollback is required.
- If a repair was started after deployment, let it finish before rolling back when
  possible; the import's existing page-level persistence remains unchanged.
- Do not restore the stuck `IMPORTING` value after a successful repair.

## Observability required for this packet

Reuse existing logger namespaces and avoid user email, Google ids, event content, or
tokens. Add only lifecycle messages needed to distinguish:

- sync acquired (`full`, `incremental`, or `repair`);
- sync ignored because runtime activity exists;
- abandoned persisted `IMPORTING` assessed as attention;
- sync terminal outcome;
- metadata terminal-state persistence failed.

Do not add metrics infrastructure. Existing structured logs are enough to validate
the repair on staging.

## Reviewed adjacent issues and disposition

| Finding | Disposition |
| --- | --- |
| `WATCH_REPAIR_FAILED` is accepted by core/web but no production backend path publishes it. | Follow-up cleanup, not required to unblock lifecycle recovery. Either publish it from the repair coordinator or remove the dead contract after confirming desired UX. |
| Watch repair can report `FULL_REPAIR_STARTED` even when the sync service ignored the request. | Fix in a small follow-up by returning an explicit service outcome; avoid expanding the core repair PR unless its test needs the result. |
| `publishUserMetadata` exists but normal metadata mutations do not publish it. | Leave alone. Metadata replay plus explicit sync-status messages are sufficient for this repair. |
| SSE has no event IDs/replay buffer. | Accepted. Metadata reconciliation is the simpler recovery mechanism for state; query invalidation already reconciles event data. |
| Process-local activity is not safe for multiple backend replicas. | Accepted under current topology. Add a Mongo lease only before enabling multiple replicas. |
| Partial full imports survive by page, but a restart may leave partial Google data until repair. | Existing durability design; this packet makes repair available instead of changing import persistence. |

## Exit criteria

- [x] No ignored path emits `syncing`.
- [x] Full and incremental sync share one per-user runtime exclusion rule.
- [x] A stored `IMPORTING` value without runtime activity becomes `ATTENTION`.
- [x] Forced repair can recover an abandoned import but cannot overlap active work.
- [x] Handled failures publish a terminal SSE status even if metadata persistence
      fails.
- [x] Healthy/attention metadata replay clears only the stale `syncing` override.
- [ ] Focused and full affected test/lint/type-check gates pass.
- [ ] Staging restart acceptance proves the original failure no longer reproduces.
- [x] No queue, poller, timer, lease, dependency, or migration was added.
