# Production go/no-go checklist — sub-calendar v1 cutover

> **This document does not authorize a cutover.** It is the fill-in-and-sign gate
> that must be complete *before* one is scheduled. Execution steps live in
> [`google-subcalendar-big-bang-runbook.md`](./google-subcalendar-big-bang-runbook.md),
> Phase P. Production remains locked.

_Architect deliverable, approved by the founder in
[standup 2026-07-14](../standups/2026-07-14.md). Prepared ahead of the gate closing
so the cutover is never waiting on paperwork._

This checklist exists because the runbook's Phase P go/no-go is a six-bullet
*reference plan*. This is the operator-facing version: every line is a box someone
ticks, with a name and a date next to it, and an explicit abort rule.

## State as of 2026-07-14 (refresh before use)

| Fact | Value |
| --- | --- |
| Staging release | `v1.0.211`, both targets healthy |
| Staging event collection | Cut over to the final strict schema |
| Production event collection | **Legacy** — `event` is still legacy-shaped |
| Staging evidence cells complete | 4 of 6 |
| Cells outstanding | 12-step acceptance; rollback + second forward run |
| Blocking decision | Staging rehearsal deferred by the founder on 2026-07-13 and again on 2026-07-14 |

**Nothing below can be signed while the two evidence cells are `pending`.**
Section A is a hard precondition, not a formality.

---

## A. Preconditions (hard gate — no sign-off is valid without these)

- [ ] Every cell in the runbook's **Staging evidence gate** table is filled and
      passing. Today two are `pending`; both are PO-gated and a human must run them.
- [ ] Packet `09` is marked complete in the
      [master plan](../archive/google-subcalendar-project/master-doc.md).
- [ ] Production still has a legacy `event` collection and its `migrations` ledger
      matches that state. **Verify, don't assume** — if prod has drifted, stop and
      re-plan.
- [ ] Disk headroom: `db.event.stats()` on prod shows the cluster has **≥ 2×** the
      `event` collection size free. The backfill writes a full second copy into
      `event_new` before the rename.

## B. Release tag selection

The tag is the single most consequential choice here: it is simultaneously what
gets deployed and what the rollback is measured against.

- [ ] **Tag chosen:** `v_______` — must be the exact tag validated on staging by the
      evidence gate, not "latest `main`". A newer `main` has not been through the gate.
- [ ] Backend, mongo, and web images for that tag exist on Docker Hub. (`release-on-main`
      produces them for every tag; confirm rather than trust.)
- [ ] `Test` and `Release on main` are green **for that tag's exact SHA**, not merely
      green on `main` today.
- [ ] **Previous production tag recorded:** `v_______` — read from
      `https://<prod>/version.json` *before* anything changes. This is the rollback
      deploy target and is unrecoverable from memory once the deploy runs.

## C. Backup verification (the only rollback for `calendar`)

The `calendar` migration is an **in-place rewrite with no programmatic reverse**. A
backup is not a precaution here; it is the rollback mechanism. The `event` path is
safer (legacy is retained as `event_legacy_v1`), but `calendar` has no such net.

- [ ] Managed-provider **snapshot** of the prod cluster triggered and confirmed
      complete. (Prod uses external managed MongoDB — the volume-tar procedure in
      `backup-and-restore.md` is self-host only and is **not** the prod backup.)
- [ ] `mongodump --uri "$MONGO_URI" --db prod_calendar --out <dir>` completed, dump
      is non-empty, document counts recorded here: `_______`
- [ ] **Restore-tested**: the dump was actually restored into a scratch database and
      the counts matched. An unrestored backup is an untested backup.
- [ ] Backup location and retention recorded: `_______________`

## D. Maintenance window

Per decisions A10/A21: one short downtime window, no dual-write, no feature flag —
**enablement is the cutover.**

- [ ] Window scheduled (low-traffic): `____-__-__  __:__ – __:__  TZ ____`
- [ ] **Duration estimated from the rehearsal's actual timings**, not guessed. The
      Phase S1–S3 rehearsal produces the number; the perf work in `v1.0.209`–`v1.0.211`
      cut import time dramatically on staging (a 2,745-event calendar went from ~17m21s
      to 17.81s), so the estimate should come from post-`v1.0.211` runs — older figures
      will badly overstate the window.
- [ ] Downtime announced to users, with a stated end time.
- [ ] Confirmed nobody else is deploying or migrating during the window.

## E. Rollback owner and communications

- [ ] **Rollback owner named:** `_______________` — one person, with the authority to
      call the abort and the access to execute it. Not "the team".
- [ ] That person has, *tested and in hand before the window opens*: SSH to the prod
      VPS, `mongosh` against `MONGO_URI`, and permission to run the **Deploy production**
      Action. Discovering a missing credential mid-rollback is the worst case this line
      exists to prevent.
- [ ] Rollback procedure (runbook Phase P → Production rollback) has been **rehearsed**
      on staging by that same person — Section A already requires the rehearsal; this
      line requires that the rollback owner is the one who did it.
- [ ] Discord deploy webhook confirmed working (the automated health check alerts through it).
- [ ] Comms plan for a failed cutover: who tells users, through which channel.

## Abort rules (bright lines — no judgment calls in the window)

Abort to rollback, without debate, if any of these occur:

- The backfill **verification summary does not pass.** Do not rename. Do not "fix it
  live". Stop.
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
| Rollback owner | | | |
| Founder | | | |

**Retain `event_legacy_v1` after a successful cutover.** It is the rollback source and
must not be dropped in v1.
