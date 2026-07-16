import { type MigrationContext } from "@scripts/common/cli.types";
import { type AnyBulkWriteOperation, ObjectId } from "mongodb";
import { type MigrationParams, type RunnableMigration } from "umzug";
import { MONGO_BATCH_SIZE } from "@backend/common/constants/backend.constants";
import mongoService from "@backend/common/services/mongo.service";
import { type EventRecord } from "@backend/event/event.record";

interface SkippedRecord {
  eventId: string;
  calendarId: string;
  reason: "calendarNotFound" | "calendarTimeZoneUnusable";
}

const calendarIdKey = (id: unknown): string =>
  id instanceof ObjectId ? id.toHexString() : String(id);

/**
 * One-off repair for `packages/backend/src/event/google-event.adapter.ts`'s
 * `event.start?.timeZone ?? calendarTimeZone ?? "UTC"` fallback: whenever
 * both were unavailable at sync time, the event's real timeZone (needed to
 * render its wall-clock time correctly - see event.record.mapper.ts) was
 * silently stamped "UTC" instead. This was invisible before the wire-format
 * fix (PR #2150) because every event rendered in UTC regardless of the
 * stored value; the fix now faithfully renders whatever is stored, which
 * exposed these records as displaying the wrong time.
 *
 * Re-derives `schedule.timeZone` from the event's owning calendar for any
 * timed event still tagged "UTC" - the same fallback the sync adapter
 * itself uses, applied after the fact. Only `schedule.timeZone` is written;
 * `schedule.start`/`end` (the actual instant) are never touched, so this
 * cannot change which absolute moment an event represents - only which
 * wall-clock time it's displayed as.
 *
 * No transaction: each event's fix is independent, so partial completion on
 * abort is safe and the migration is naturally resumable (see MigrationContext
 * dryRun and the shared-tier notes in compass-calendar-internal/prod-operations.md
 * - bulkWrite in batches, no per-doc round trips, no transaction to blow the
 * 60s lifetime). Safe to rerun: converges to zero further changes once every
 * resolvable record is fixed; unresolved records (see SkippedRecord) need a
 * human, not a rerun.
 */
export default class Migration implements RunnableMigration<MigrationContext> {
  readonly name: string = "2026.07.15T22.00.00.timed-event-timezone-repair";
  readonly path: string = "2026.07.15T22.00.00.timed-event-timezone-repair.ts";

  async up(params: MigrationParams<MigrationContext>): Promise<void> {
    const { logger, dryRun } = params.context;
    const prefix = dryRun ? "[dry-run] " : "";

    const calendars = await mongoService.calendar
      .find({}, { projection: { timeZone: 1 } })
      .toArray();
    const calendarTimeZoneById = new Map<string, string | null>(
      calendars.map((c) => [calendarIdKey(c._id), c.timeZone]),
    );

    const cursor = mongoService.event.find(
      { "schedule.kind": "timed", "schedule.timeZone": "UTC" },
      { batchSize: MONGO_BATCH_SIZE },
    );

    let scanned = 0;
    let updated = 0;
    const updatedByTimeZone = new Map<string, number>();
    const skipped: SkippedRecord[] = [];
    let ops: AnyBulkWriteOperation<EventRecord>[] = [];

    const flush = async (): Promise<void> => {
      if (ops.length === 0) return;
      if (!dryRun) {
        await mongoService.event.bulkWrite(ops, { ordered: false });
      }
      ops = [];
    };

    for await (const event of cursor) {
      scanned += 1;
      if (event.schedule.kind !== "timed") continue;

      const calendarKey = calendarIdKey(event.calendarId);
      const calendarTimeZone = calendarTimeZoneById.get(calendarKey);

      if (calendarTimeZone === undefined) {
        skipped.push({
          eventId: calendarIdKey(event._id),
          calendarId: calendarKey,
          reason: "calendarNotFound",
        });
        continue;
      }
      if (!calendarTimeZone || calendarTimeZone === "UTC") {
        skipped.push({
          eventId: calendarIdKey(event._id),
          calendarId: calendarKey,
          reason: "calendarTimeZoneUnusable",
        });
        continue;
      }

      ops.push({
        updateOne: {
          filter: { _id: event._id },
          update: { $set: { "schedule.timeZone": calendarTimeZone } },
        },
      });
      updated += 1;
      updatedByTimeZone.set(
        calendarTimeZone,
        (updatedByTimeZone.get(calendarTimeZone) ?? 0) + 1,
      );

      if (ops.length >= MONGO_BATCH_SIZE) await flush();
    }
    await flush();

    logger.info(
      `${prefix}Timed-event timeZone repair: scanned=${scanned} updated=${updated} skipped=${skipped.length}`,
    );
    for (const [timeZone, count] of updatedByTimeZone) {
      logger.info(`${prefix}  -> ${timeZone}: ${count}`);
    }
    if (skipped.length > 0) {
      logger.info(
        `${prefix}Unresolved records (need manual follow-up): ${JSON.stringify(
          skipped,
        )}`,
      );
    }
  }

  async down(params: MigrationParams<MigrationContext>): Promise<void> {
    params.context.logger.info(
      "Down migration is a non-destructive no-op: reverting schedule.timeZone " +
        'back to "UTC" would just resurrect the display bug this repair fixes.',
    );
    return Promise.resolve();
  }
}
