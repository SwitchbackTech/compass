import { type MigrationContext } from "@scripts/common/cli.types";
import { ObjectId } from "mongodb";
import { type MigrationParams, type RunnableMigration } from "umzug";
import mongoService from "@backend/common/services/mongo.service";
import { type EventRecord } from "@backend/event/event.record";
import { getAnchorDate } from "@backend/event/services/recur/util/recur.util";

const anchorMs = (record: EventRecord): number =>
  getAnchorDate(record.schedule).getTime();

/**
 * One-off repair for the pre-fix "base = first occurrence" model (see
 * gridEventsFrom / materializeSeriesInstances): heals data written before
 * the series base became metadata-only.
 *
 * Two independent defects, both scoped per series base:
 *  1. Echo duplicates -- a Compass-created series propagated only its base
 *     to Google; the webhook echo then inserted Google's own copies of the
 *     occurrences as new documents instead of adopting the existing
 *     unlinked ones. Any unlinked occurrence that shares a start with an
 *     already-linked occurrence is a leftover duplicate.
 *  2. Missing first occurrence -- a series base that has never synced to
 *     Google (still `externalReference: null`) never materialized its own
 *     first occurrence under the old model. A Google-linked base's missing
 *     first occurrence is left alone: that means the instance was
 *     legitimately cancelled upstream, and inserting one would resurrect
 *     it.
 *
 * Safe to rerun: both effects converge to zero further changes once the
 * data is clean.
 */
export default class Migration implements RunnableMigration<MigrationContext> {
  readonly name: string =
    "2026.07.13T12.00.00.recurring-series-first-occurrence-repair";
  readonly path: string =
    "2026.07.13T12.00.00.recurring-series-first-occurrence-repair.ts";

  async up(params: MigrationParams<MigrationContext>): Promise<void> {
    const { logger, dryRun } = params.context;
    const prefix = dryRun ? "[dry-run] " : "";

    let seriesScanned = 0;
    let echoDuplicatesRemoved = 0;
    let firstOccurrencesBackfilled = 0;

    const baseCursor = mongoService.event.find({ "recurrence.kind": "series" });

    for await (const base of baseCursor) {
      if (base.recurrence.kind !== "series") continue;

      seriesScanned += 1;
      const baseAnchorMs = anchorMs(base);

      const occurrences = await mongoService.event
        .find({
          "recurrence.kind": "occurrence",
          "recurrence.seriesId": base._id,
        })
        .toArray();

      const linkedStartsMs = new Set(
        occurrences
          .filter((occurrence) => occurrence.externalReference !== null)
          .map(anchorMs),
      );

      const dupeIds = occurrences
        .filter(
          (occurrence) =>
            occurrence.externalReference === null &&
            linkedStartsMs.has(anchorMs(occurrence)),
        )
        .map((occurrence) => occurrence._id);

      if (dupeIds.length > 0) {
        logger.info(
          `${prefix}series ${base._id.toHexString()}: removing ${dupeIds.length} unlinked duplicate occurrence(s)`,
        );
        if (!dryRun) {
          await mongoService.event.deleteMany({ _id: { $in: dupeIds } });
        }
        echoDuplicatesRemoved += dupeIds.length;
      }

      if (base.externalReference === null) {
        const dupeIdSet = new Set(dupeIds.map((id) => id.toHexString()));
        const hasFirstOccurrence = occurrences.some(
          (occurrence) =>
            !dupeIdSet.has(occurrence._id.toHexString()) &&
            anchorMs(occurrence) === baseAnchorMs,
        );

        if (!hasFirstOccurrence) {
          logger.info(
            `${prefix}series ${base._id.toHexString()}: backfilling missing first occurrence`,
          );
          if (!dryRun) {
            await mongoService.event.insertOne({
              _id: new ObjectId(),
              calendarId: base.calendarId,
              content: base.content,
              schedule: base.schedule,
              recurrence: { kind: "occurrence", seriesId: base._id },
              priority: base.priority,
              externalReference: null,
              createdAt: base.createdAt,
              updatedAt: base.updatedAt,
            });
          }
          firstOccurrencesBackfilled += 1;
        }
      }
    }

    logger.info(
      `${prefix}Recurring series repair complete: seriesScanned=${seriesScanned} ` +
        `echoDuplicatesRemoved=${echoDuplicatesRemoved} firstOccurrencesBackfilled=${firstOccurrencesBackfilled}`,
    );
  }

  async down(params: MigrationParams<MigrationContext>): Promise<void> {
    params.context.logger.info(
      "Down migration is a non-destructive no-op: the duplicates removed " +
        "and gaps backfilled by this repair are not worth re-introducing.",
    );
    return Promise.resolve();
  }
}
