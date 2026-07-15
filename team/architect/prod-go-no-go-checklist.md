# Production go/no-go checklist — sub-calendar v1 cutover

> **Gate opened by the founder on 2026-07-15.** This is the fill-in-and-sign gate
> completed before execution. Execution steps live in
> [`google-subcalendar-big-bang-runbook.md`](./google-subcalendar-big-bang-runbook.md)
> Phase P, operationalized with production-specific findings in
> [`prod-cutover-execution-2026-07-15.md`](./prod-cutover-execution-2026-07-15.md).

_Architect deliverable, approved by the founder in
[standup 2026-07-14](../standups/2026-07-14.md). Prepared ahead of the gate closing
so the cutover is never waiting on paperwork._

This checklist exists because the runbook's Phase P go/no-go is a six-bullet
*reference plan*. This is the operator-facing version: every line is a box someone
ticks, with a name and a date next to it, and an explicit abort rule.

## State as of 2026-07-15 (verified against live systems this day)

| Fact | Value |
| --- | --- |
| Staging release | `v1.0.235` (read from staging `/version.json`), healthy |
| Staging event collection | Cut over to the final strict schema |
| Production release | `v1.0.97` (read from `https://compasscalendar.com/version.json`) |
| Production event collection | **Legacy** — 989,131 `user`-owned rows, 0 `calendarId`-owned, no `event_new`/`event_legacy_v1`, no validator |
| Production migrations ledger | 5 records (through `2025.10.16`); **7 pending**, including the `2025.10.18` prototype pair — see the execution plan |
| Production Mongo | Managed Atlas cluster (address in the operator's private notes, outside git), db `prod_calendar` (~197 MB on disk; shared tier — `allowDiskUse` unavailable) |
| Staging evidence cells | Complete: acceptance founder-validated 2026-07-15 on `v1.0.235`; S3 rollback rehearsal **waived by founder 2026-07-15** (see runbook waiver) |

Section A is satisfied via the founder's 2026-07-15 acceptance + waiver decision.

---

## A. Preconditions (hard gate — no sign-off is valid without these)

- [x] Every cell in the runbook's **Staging evidence gate** table is filled and
      passing. Closed 2026-07-15: acceptance founder-validated on `v1.0.235`;
      S3 rollback rehearsal waived by founder (waiver recorded in the runbook).
- [x] Packet `09` is marked complete in the
      [master plan](../archive/google-subcalendar-project/master-doc.md)
      (closed 2026-07-15 with the founder acceptance + waiver note).
- [x] Production still has a legacy `event` collection and its `migrations` ledger
      matches that state. Verified 2026-07-15 by direct `mongosh` queries:
      989,131 `user`-owned events, 0 `calendarId`-owned, no `event_new` /
      `event_legacy_v1`, no validator, ledger has exactly the five 2025.10.03–10.16
      records. `migrate pending` lists 7 (the 2025.10.18 prototype pair + the five
      v1 migrations) — see the execution plan for how the pair is handled.
- [x] Disk headroom: verified 2026-07-15 — `prod_calendar` is ~197 MB on disk
      (dataSize 466 MB, storageSize 87 MB, indexSize 109 MB); the backfill's second
      copy adds well under 1× even on the smallest Atlas shared tier.

## B. Release tag selection

The tag is the single most consequential choice here: it is simultaneously what
gets deployed and what the rollback is measured against.

- [x] **Tag chosen:** the tag cut from the cutover-prep PR (originally `v1.0.235`
      from staging `/version.json`; the dry-run rehearsal exposed a backfill crash
      on prod's string-`_id` rows, and the founder approved shipping the one-line
      fix as a new tag — runtime code stays byte-identical to the validated
      `v1.0.235`; the delta is docs, the migration fix, and its test). Final tag:
      **`v1.0.236`** (cut 2026-07-15 from PR #2144 merge `c6967be9b`).
- [x] Backend, mongo, and web images for `1.0.236` exist on Docker Hub
      (verified 2026-07-15 via the Docker Hub API).
- [x] `Test`, `Release on main`, and `CodeQL` are green for `c6967be9b`, and
      staging auto-updated to `1.0.236` with `/api/health` 200 before the window.
- [x] **Previous production tag recorded: `v1.0.97`** — read from
      `https://compasscalendar.com/version.json` on 2026-07-15. This is the rollback
      deploy target.

## C. Backup verification (the only rollback for `calendar`)

The `calendar` migration is an **in-place rewrite with no programmatic reverse**. A
backup is not a precaution here; it is the rollback mechanism. The `event` path is
safer (legacy is retained as `event_legacy_v1`), but `calendar` has no such net.

- [x] Managed-provider **snapshot** of the prod Atlas cluster triggered by the
      founder — confirmed at GATE 1, 2026-07-15. (Prod uses external managed
      MongoDB — the volume-tar procedure in `backup-and-restore.md` is self-host
      only and is **not** the prod backup.)
- [x] Fresh in-window `mongodump --gzip --db prod_calendar` completed 2026-07-15
      15:18 local: **996,660 documents, 0 errors**, all 9 collections;
      restore-checked into a scratch DB with exact count matches
      (989,268 events / 941 users / 908 calendars / 915 sync).
- [x] **Restore-tested**: the 2026-07-15 preflight dump (996,660 docs, all 9
      collections) was restored into a local Mongo 8.0 replica set with 0 failures
      and exact count matches — and then used as the dry-run rehearsal target.
      The in-window dump uses the identical command and is spot-verified the same way.
- [x] Backup location and retention: preflight and in-window dumps live on the
      founder's admin machine (exact paths in the operator's private notes,
      outside git), plus the Atlas snapshot. Retain all three at least until
      `event_legacy_v1` is dropped in some future release.

## D. Maintenance window

Per decisions A10/A21: one short downtime window, no dual-write, no feature flag —
**enablement is the cutover.**

- [ ] Window scheduled (low-traffic): `2026-07-15  __:__ – __:__  TZ ____` —
      founder confirms at GATE 1.
- [x] **Duration estimated from actual timings** of the 2026-07-15 dry-run
      rehearsal on a full restored copy of production data (see the execution
      log's timing table). Dump ≈ 90 s; migration timings recorded there.
- [ ] Downtime announced to users, with a stated end time.
- [ ] Confirmed nobody else is deploying or migrating during the window
      (the autonomous team must be idle; no standup workflow mid-flight).

## E. Rollback owner and communications

- [x] **Rollback owner named: Tyler (founder)** — with the authority to call the
      abort and the access to execute it.
- [x] Access tested in hand before the window (2026-07-15, from the admin machine
      Claude drives under Tyler's credentials): SSH to the prod VPS verified,
      `mongosh` against the prod `MONGO_URI` verified (read-only preflight
      queries), `gh` authenticated for the **Deploy production** Action.
- [ ] ~~Rollback rehearsed on staging by the rollback owner~~ — **waived by the
      founder 2026-07-15** (waiver in the runbook). Compensating control: the
      full forward sequence was dry-run on a restored copy of production data
      before the window, and the abort rules below are treated as hard stops.
- [ ] Discord deploy webhook confirmed working (the automated health check alerts through it).
- [ ] Comms plan for a failed cutover: who tells users, through which channel.

## Abort rules (bright lines — no judgment calls in the window)

Abort to rollback, without debate, if any of these occur:

- The backfill **verification summary does not pass.** Do not rename. Stop.
  One nuance, rehearsed and founder-approved 2026-07-15: *data-policy class*
  failures naming specific rows (rows written after the preflight dump) are
  handled by deleting exactly the named `_id`s and rerunning — that loop is
  convergent and is part of the procedure, not a "fix it live". Any
  count/hash/category **verification mismatch** is a hard abort.
- The strict-validator checks fail after the post-cutover repairs.
- The automated health check fails, or `/version.json` does not equal the deployed tag.
- Any Mongo code `121` (document validation failure) appears during or after the run.

Known-acceptable, **not** abort triggers: the documented cutover data-policy deletions
(zero-duration timed Google events, Google events with no owning calendar row,
duplicate `gEventId` copies, events of deleted accounts) — all preserved in the backup
and in `event_legacy_v1`. The read-only-calendar left-click-open race is a deferred,
accepted follow-up.

## Sign-off

No production action begins until every box above is ticked and both signatures are present.

| Role | Name | Date | Go / No-Go |
| --- | --- | --- | --- |
| Rollback owner | Tyler | 2026-07-15 | Go (GATE 4 confirmation) |
| Founder | Tyler | 2026-07-15 | Go (GATE 4 confirmation) |

**Executed 2026-07-15.** Deploy run 29455264833 green; see
[`prod-cutover-execution-2026-07-15.md`](./prod-cutover-execution-2026-07-15.md)
for the full live log and outcome.

**Retain `event_legacy_v1` after a successful cutover.** It is the rollback source and
must not be dropped in v1.
