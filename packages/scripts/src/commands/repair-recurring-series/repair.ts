import { type Db, type MongoClient } from "mongodb";
import { projectOccurrences } from "@sync/domain/occurrence-projection";
import {
  deleteExceptions,
  exceptionInstant,
  isCancelledException,
  reprojectMaster,
} from "@sync/domain/series-exception";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";
import {
  type EventRecord,
  EventRecordSchema,
} from "@sync/storage/contracts/event.contracts";
import { EventRepository } from "@sync/storage/repositories/event.repository";
import { EventOccurrenceRepository } from "@sync/storage/repositories/event-occurrence.repository";

export type RepairRecurringSeriesReport = {
  generatedAt: string;
  dryRun: boolean;
  mastersScanned: number;
  // Every master reprojected (or that would be) — the pre-write id list the
  // migration playbook asks for. junkExceptionIds are the tombstones deleted
  // (or that would be) alongside them.
  masterIds: string[];
  junkExceptionIds: string[];
  // Non-cancelled overrides whose recurrenceId is not an instant of the fixed
  // expansion. They carry user content, so they are reported, never deleted.
  suspectOverrideIds: string[];
  // Skipped; run purge-corrupt-sync-events for the per-doc detail.
  unparseableMasters: number;
};

// One-shot repair for series masters whose rules carry EXDATE/RDATE lines.
// Before the expansion fix, those series projected occurrences anchored at
// the projection run's wall clock ("now") instead of the series start, so
// dead series resurfaced in the present and per-instance delete tombstones
// were keyed to instants the series never actually produces. This command
// reprojects every such master under the fixed expansion and removes the
// orphaned cancelled tombstones. Safe to rerun.
export async function repairRecurringSeries(
  db: Db,
  client: MongoClient,
  options: { dryRun: boolean; now?: () => Date },
): Promise<RepairRecurringSeriesReport> {
  const now = options.now ?? (() => new Date());
  const events = new EventRepository(db);
  const occurrences = new EventOccurrenceRepository(db, client);
  const deps = { events, occurrences };

  const report: RepairRecurringSeriesReport = {
    generatedAt: now().toISOString(),
    dryRun: options.dryRun,
    mastersScanned: 0,
    masterIds: [],
    junkExceptionIds: [],
    suspectOverrideIds: [],
    unparseableMasters: 0,
  };

  const cursor = db.collection(SYNC_COLLECTIONS.events).find(
    {
      "recurrence.kind": "seriesMaster",
      "recurrence.rules": { $elemMatch: { $not: /^RRULE:/i } },
    },
    // Rules content isn't indexed, so this is a one-shot COLLSCAN over
    // events: read from a secondary so the scan doesn't compete with the
    // primary's working set.
    { readPreference: "secondaryPreferred", batchSize: 200 },
  );

  for await (const doc of cursor) {
    report.mastersScanned += 1;
    const parsed = EventRecordSchema.safeParse(doc);
    if (!parsed.success) {
      report.unparseableMasters += 1;
      continue;
    }
    const master = parsed.data;
    report.masterIds.push(master._id);
    const scope = {
      tenantId: master.tenantId,
      principalId: master.principalId,
    };

    const exceptions = await events.findSeriesExceptions(
      master.tenantId,
      master.principalId,
      master._id,
    );
    const junk: EventRecord[] = [];
    for (const exception of exceptions) {
      if (isSeriesInstant(master, exceptionInstant(exception))) continue;
      if (isCancelledException(exception)) {
        junk.push(exception);
        report.junkExceptionIds.push(exception._id);
      } else {
        report.suspectOverrideIds.push(exception._id);
      }
    }

    if (options.dryRun) continue;

    // Delete junk tombstones BEFORE reprojecting: reprojectMaster re-reads
    // exceptions fresh, so only survivors' instants get excluded.
    await deleteExceptions(deps, scope, junk);
    await reprojectMaster(deps, scope, master, now);
  }

  return report;
}

// Whether the fixed expansion produces an occurrence exactly at `instant`.
// A point horizon [instant, instant+1ms) makes this exact without depending
// on the rolling sync horizon (a legit 13-month-old tombstone is a member).
function isSeriesInstant(master: EventRecord, instant: string): boolean {
  const at = new Date(instant);
  const rows = projectOccurrences(master, {
    start: at,
    end: new Date(at.getTime() + 1),
  });
  return rows.some((row) => row.startAt.getTime() === at.getTime());
}
