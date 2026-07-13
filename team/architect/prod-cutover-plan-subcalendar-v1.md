# Sub-calendar v1 — Safe production cutover plan

_Architect deliverable, 2026-07-13. Verified against `origin/main` @ `2c08e9f2e`._

## Context

The sub-calendar v1 work is code-complete and has been running on **staging** for
weeks (staging auto-deploys every merge to `main`). **Production has never
deployed any of it** and still runs the pre-cutover release. The founder wants to
finally ship to prod, but is worried about corrupting user data.

That worry is well-placed and points at one specific thing. The v1 release changed
how events are stored — from a single per-user `event` collection to a
**calendar-owned** model — and the runtime code on `main` now *reads the `event`
collection expecting the new schema*. On staging that collection has already been
migrated and renamed; **on production it is still legacy-shaped**. So deploying
current `main` to prod **without first running the migration + collection rename
would point new code at legacy documents** — exactly the corruption hazard to avoid.

The migration itself was engineered defensively (see risk analysis below), and a
detailed operator runbook already exists at
[`docs/self-hosting/event-migration-runbook.md`](../../docs/self-hosting/event-migration-runbook.md).
This plan turns that runbook into an **execute-now**, prod-specific cutover
procedure with a mandatory full rehearsal on prod-shaped data, a scheduled
downtime window, and a rehearsed rollback.

Decisions this plan honors (from the master decision log,
[`team/archive/google-subcalendar-project/master-doc.md`](../archive/google-subcalendar-project/master-doc.md)): **A10/A21** one
short downtime window, no dual-write; **A31/A36** rename collections during the
pause, production cuts over exactly once, manually; there is **no feature flag**
(A10) — enablement *is* the cutover.

---

## Why the data risk is contained (and where it isn't)

| Migration | What it does | Risk |
|---|---|---|
| `calendar-record-migration` ([file](../../packages/scripts/src/migrations/2026.07.10T21.00.00.calendar-record-migration.ts)) | Rewrites the live `calendar` collection **in place** (`user`→`userId`, `selected`→`isVisible`, etc.), creates one Compass-local calendar per user | **This is the only in-place rewrite.** Document writes run inside a **single MongoDB transaction** that aborts atomically on any unconvertible row. Idempotent on rerun. **A pre-migration backup is its only rollback.** |
| `event-record-backfill` ([file](../../packages/scripts/src/migrations/2026.07.10T21.30.00.event-record-backfill.ts)) | Rebuilds the **inactive `event_new`** collection from legacy `event` using a deterministic transform, then verifies source↔destination equivalence | **Low risk.** Legacy `event` is never modified. Bounded cursors (`MONGO_BATCH_SIZE`), fail-closed on any transform failure / duplicate provider id / verification mismatch, convergent on rerun (`deleteMany` on `event_new` only). |
| Collection rename (cutover) | `event` → `event_legacy_v1`, `event_new` → `event` | The legacy collection is **retained as the rollback source** and must not be dropped in v1. |

Key safety properties, verified in-code:
- **Legacy `event` is never written** by either migration — it stays the source of truth until the rename, and survives (renamed) afterward.
- Both migrations are **idempotent**; reruns converge with no duplicates.
- Both `down()` methods are **non-destructive no-ops** — rollback is operational
  (backup restore / reverse rename), never programmatic.
- **Sharp edge to monitor:** the calendar migration relaxes the collection
  validator and drops legacy indexes *outside* the transaction (collMod can't run
  inside one), then re-applies the strict validator/indexes after commit. If the
  process is killed *between* those steps, `calendar` is briefly left with
  validation `off`. Re-running the (idempotent) migration to completion repairs it;
  do not leave a half-applied run in place.

**Accepted, documented data losses (take the backup first — it preserves everything):**
- Cutover data policy deletes rows the strict contract cannot represent, all
  recoverable-from-source or unreachable: zero-duration timed Google events,
  Google events owned by users with no calendar row, duplicate `gEventId` copies,
  and events of deleted accounts.
- **Rollback after cutover abandons writes made since the cutover** (no dual-write
  replay). Keep the window short; the new `event` collection is dumped before any
  rollback so those writes are recoverable by hand.

---

## Production infrastructure facts that shape this plan

- **Prod deploy is manual only**: the `Deploy production` GitHub Action
  (`workflow_dispatch`, [deploy-production.yml](../../.github/workflows/deploy-production.yml))
  takes a release `tag` and does **not** run migrations. Migrations are entirely
  separate and manual (`bun run cli migrate up`).
- **Prod uses an external managed MongoDB** (`MONGO_URI` secret) + SuperTokens
  Cloud — **not** the self-hosted Mongo container. DB name: **`prod_calendar`**.
  ⇒ The volume-tar backup in `backup-and-restore.md` is a *self-host* procedure and
  is **not** the right prod backup. Prod backup = `mongodump` against `MONGO_URI`
  **plus** a managed-provider snapshot.
- The external Mongo **is reachable** from a trusted admin box, so `migrate up` and
  `mongosh` can be run off-host; only the backend write-pause happens over SSH to
  the prod VPS.
- **Health is auto-checked** after deploy ([deploy-health-check.yml](../../.github/workflows/deploy-health-check.yml)):
  asserts `/version.json` == tag, backend `/api/health` ok, cloud Mongo has ≥1
  user/event, greps logs for fatals, Discord-alerts on failure.
- A prod deploy of tag `vX.Y.Z` assumes the backend/mongo images for that tag are
  already on Docker Hub — true for any tag produced by `release-on-main`.

---

## Go / No-Go gate (all must be true before the window opens)

1. **Choose the release tag.** Use the exact `vX.Y.Z` tag currently running and
   validated on staging (the build that passed staging health checks + acceptance).
   Confirm its backend/mongo/web images exist on Docker Hub.
2. **CI is green on the chosen tag.** `main` is currently green (verified: latest
   `Test` + `Release on main` runs succeeded at tip `2c08e9f2e`; the earlier
   `/week` redirect failure was fixed when
   [#2073](https://github.com/SwitchbackTech/compass/pull/2073) merged). Confirm the
   `Test`/`test-e2e` runs for the exact tag's SHA are green before deploying.
3. **Prod-shaped rehearsal passed** (Phase 1 below) — forward migrate + verify +
   rename + smoke **and** a rollback, then a second forward run to prove idempotence.
4. **12-step manual acceptance passed on staging** with a real 3-calendar Google
   account (packet 09 runbook). This plus the Phase 1 rehearsal are the **only two
   outstanding items** gating prod (all v1 packets 01–08 are shipped; both remaining
   items are PO-gated per A36). The known read-only-card left-click bug is a
   deferred, accepted follow-up — not a blocker.
5. **Backups exist and are verified** for prod (Phase 2, step 1) — mongodump +
   managed snapshot, restore-tested.
6. **Rollback owner + comms** identified; Discord deploy webhook working; downtime
   window announced.

---

## Phase 0 — Preflight (day before)

- Record the **current prod release tag** (from `https://<prod>/version.json`) — this
  is your rollback deploy target.
- Confirm admin access: SSH to the prod VPS (`SSH_HOST`/`SSH_USER`), and a machine
  with `bun`, a checkout of the release tag, and a prod `compass.yaml`
  (`COMPASS_CONFIG_FILE`) that can reach `MONGO_URI`.
- `bun run cli migrate pending` against prod ⇒ confirm exactly the two v1
  migrations are pending and the 2025 migrations are already recorded.
- **Disk/scale check:** `db.event.stats()` on prod — confirm the managed cluster has
  ≥ 2× `event` size free (the backfill writes a full copy into `event_new`).
- Announce the maintenance window.

## Phase 1 — Full rehearsal on prod-shaped data (blocking)

Do this in a **scratch environment** (throwaway staging-selfhosted project or a temp
Compose project), never against live prod.

1. `mongodump` a **sanitized** copy of prod (or the freshest prod backup) and restore
   it into the scratch DB. Record source counts + category hashes.
2. Take a fresh scratch backup (the rehearsal's rollback source).
3. `bun run cli migrate up` ⇒ watch the logged counts (calendar rows reshaped, local
   calendars created; backfill attempted/inserted/failed, timezone tally, someday
   sort orders, `allDayOrder` audit). It must end with **verification passed**.
4. Verify data, indexes, sync records; run app smoke tests.
5. Rehearse the **write pause + rename** (stop backend → rerun migrate → `mongosh`
   rename → deploy tag → start).
6. Rehearse **rollback**: `mongodump` the new `event`, rename back
   (`event`→`event_new`, `event_legacy_v1`→`event`), redeploy the prior tag, confirm
   legacy events readable.
7. Re-run the forward cutover to prove **idempotence**.
8. Capture exact commands + observed counts as the prod script; abort the whole
   plan if any step surprises you.

## Phase 2 — Production cutover (the scheduled window)

Per the runbook, run at low traffic. Steps, in order:

1. **Back up prod (the only rollback):**
   - Trigger a **managed-provider snapshot** of the prod cluster.
   - `mongodump --uri "$MONGO_URI" --db prod_calendar --out <backup-dir>` and verify
     the dump is non-empty and restorable (spot-restore into scratch).
2. **Pause writes** — SSH to prod VPS, stop the backend (cloud profile; Mongo is
   external and stays up):
   `COMPOSE_PROFILES=selfhosted docker compose ... stop backend` (or `./compass stop`
   if only the app stack should pause — confirm which during rehearsal).
3. **Run the migrations** against prod (idempotent — this captures every write since
   any earlier run): `bun run cli migrate up` with `COMPASS_CONFIG_FILE=<prod yaml>`.
   Confirm the **verification summary passes**. If it throws, **stop** — fix the
   named rows or abort to rollback; do not rename.
4. **Rename collections** (`mongosh` against `prod_calendar`):
   ```javascript
   use prod_calendar;
   db.event.renameCollection("event_legacy_v1");
   db.event_new.renameCollection("event");
   ```
5. **Deploy the runtime-cutover app**: run the **`Deploy production`** GitHub Action
   with the chosen tag. This rebuilds/pushes the prod web image and runs
   `./compass update` (pull + up + health wait) on the VPS, then the automated health
   check (version gate, `/api/health`, Mongo counts, log scan, Discord).
6. **Resume** — the deploy restarts the backend; confirm it's serving.

## Phase 3 — Post-cutover verification

- Automated health check (from the Action) is green; no Discord failure alert.
- `https://<prod>/version.json` == deployed tag.
- Manual smoke as a real user: sign in, load a week with events, create + edit +
  delete a timed / all-day / someday event, confirm sub-calendar sidebar + visibility
  toggles, confirm a Google-side change reconciles.
- Spot-check counts: `event` (new) vs `event_legacy_v1` categories match the
  verification summary; every user has one local calendar.
- **Keep `event_legacy_v1`** — do not drop it in v1. It is the rollback source.
- Watch logs/Discord for the next hours.

---

## Rollback procedure (rehearsed in Phase 1)

Trigger if verification fails, health checks fail, or smoke reveals data issues.
**Cost: writes since cutover are abandoned** (dumped first, recoverable by hand).

1. Stop the backend.
2. `mongodump --uri "$MONGO_URI" --db prod_calendar --collection event --out /tmp/post-cutover-dump`
   (preserve post-cutover writes).
3. Reverse the rename:
   ```javascript
   use prod_calendar;
   db.event.renameCollection("event_new");
   db.event_legacy_v1.renameCollection("event");
   ```
4. Re-run the **`Deploy production`** Action with the **previous** tag (from Phase 0).
5. Start the backend; confirm legacy events are readable.
6. If the `calendar` collection is suspect (in-place rewrite), **restore it from the
   Phase 2 backup / managed snapshot** — the calendar migration has no reverse.

---

## Critical files / references

- Migrations: [`packages/scripts/src/migrations/2026.07.10T21.00.00.calendar-record-migration.ts`](../../packages/scripts/src/migrations/2026.07.10T21.00.00.calendar-record-migration.ts),
  [`...T21.30.00.event-record-backfill.ts`](../../packages/scripts/src/migrations/2026.07.10T21.30.00.event-record-backfill.ts)
- Runner / CLI: [`packages/scripts/src/commands/migrate.ts`](../../packages/scripts/src/commands/migrate.ts) (`bun run cli migrate up|pending`), Umzug + `migrations` ledger collection
- Verifier (re-runnable): [`packages/scripts/src/common/event-migration.verify.ts`](../../packages/scripts/src/common/event-migration.verify.ts)
- Operator runbook: [`docs/self-hosting/event-migration-runbook.md`](../../docs/self-hosting/event-migration-runbook.md)
- Backup (adapt for cloud Mongo): [`docs/self-hosting/backup-and-restore.md`](../../docs/self-hosting/backup-and-restore.md)
- Release gate: [`team/archive/google-subcalendar-project/09-v1-release-hardening.md`](../archive/google-subcalendar-project/09-v1-release-hardening.md); decisions: [`team/archive/google-subcalendar-project/master-doc.md`](../archive/google-subcalendar-project/master-doc.md)
- Deploy: [`deploy-production.yml`](../../.github/workflows/deploy-production.yml), [`_deploy-environment.yml`](../../.github/workflows/_deploy-environment.yml), [`deploy-health-check.yml`](../../.github/workflows/deploy-health-check.yml)

## Known follow-ups (not blockers)

- The stale `team/backlog/…` doc references left over from the #2074 archive move
  are fixed in this PR (runbook, backup-and-restore, performance-baselines, and the
  domain-model doc now point at `team/archive/google-subcalendar-project/`). The
  runbook still says the cutover is "performed with the runtime-cutover release, not
  now" — that release has since shipped to staging; a phrasing refresh is a minor
  future follow-up.
- Read-only calendar card left-click open race — deferred, accepted; reliable
  inspection paths are keyboard "M" and context-menu "View".

## Verification of this plan end-to-end

The plan is validated by executing Phase 1 (the full rehearsal) before any prod
action — that *is* the end-to-end test of the migration + cutover + rollback against
prod-shaped data. Nothing touches production until that rehearsal and the Go/No-Go
gate pass.
