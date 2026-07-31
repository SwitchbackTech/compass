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
  mastersRepaired: number;
  wouldRepair: number;
  junkExceptionsDeleted: number;
  wouldDelete: number;
  junkExceptionIds: string[];
  // Non-cancelled overrides whose recurrenceId is not an instant of the fixed
  // expansion. They carry user content, so they are reported, never deleted.
  suspectOverrideIds: string[];
  unparseableMasters: Array<{ id: string; detail: string }>;
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
  options: { dryRun: boolean; now?: () => Date } = { dryRun: true },
): Promise<RepairRecurringSeriesReport> {
  const now = options.now ?? (() => new Date());
  const events = new EventRepository(db);
  const occurrences = new EventOccurrenceRepository(db, client);
  const deps = { events, occurrences };

  const report: RepairRecurringSeriesReport = {
    generatedAt: now().toISOString(),
    dryRun: options.dryRun,
    mastersScanned: 0,
    mastersRepaired: 0,
    wouldRepair: 0,
    junkExceptionsDeleted: 0,
    wouldDelete: 0,
    junkExceptionIds: [],
    suspectOverrideIds: [],
    unparseableMasters: [],
  };

  const cursor = db.collection(SYNC_COLLECTIONS.events).find({
    "recurrence.kind": "seriesMaster",
    "recurrence.rules": { $elemMatch: { $not: /^RRULE:/i } },
  });

  for await (const doc of cursor) {
    report.mastersScanned += 1;
    const parsed = EventRecordSchema.safeParse(doc);
    if (!parsed.success) {
      report.unparseableMasters.push({
        id: String(doc["_id"]),
        detail: parsed.error.issues
          .slice(0, 3)
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; "),
      });
      continue;
    }
    const master = parsed.data;
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
      const member = isSeriesInstant(master, exceptionInstant(exception));
      if (member) continue;
      if (isCancelledException(exception)) {
        junk.push(exception);
        report.junkExceptionIds.push(exception._id);
      } else {
        report.suspectOverrideIds.push(exception._id);
      }
    }

    if (options.dryRun) {
      report.wouldRepair += 1;
      report.wouldDelete += junk.length;
      continue;
    }

    // Delete junk tombstones BEFORE reprojecting: reprojectMaster re-reads
    // exceptions fresh, so only survivors' instants get excluded.
    await deleteExceptions(deps, scope, junk);
    report.junkExceptionsDeleted += junk.length;
    await reprojectMaster(deps, scope, master, now);
    report.mastersRepaired += 1;
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
