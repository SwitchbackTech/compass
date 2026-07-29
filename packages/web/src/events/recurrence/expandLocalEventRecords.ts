import { eventMatchesRange } from "@web/events/queries/event.query.normalize";
import { type LocalEventRecord } from "@web/events/types/local-event.record";
import { projectSeriesMaterialization } from "./projectRecurringEdit";

/**
 * Range-read over local records with series expansion: local storage keeps
 * one record per series (no materialized instances, unlike the backend), so
 * occurrences are expanded here at read time. Instances inherit the series
 * record's demo flag; a stored record with the same composed id (an edited
 * occurrence) wins over its expanded counterpart. Mirroring the server's
 * list join, the series base record is returned only alongside its in-range
 * instances.
 */
export function expandLocalEventRecords(
  records: readonly LocalEventRecord[],
  range: { start: string; end: string },
): LocalEventRecord[] {
  const storedIds = new Set(records.map((record) => record.id));

  return records.flatMap((record) => {
    if (record.event.recurrence.kind !== "series") {
      return eventMatchesRange(record.event, range.start, range.end)
        ? [record]
        : [];
    }

    const { upserts } = projectSeriesMaterialization({
      base: record.event,
      ranges: [range],
      exdates: record.exdates,
    });
    const instances = upserts
      .filter(
        (event) =>
          event.recurrence.kind === "occurrence" &&
          !storedIds.has(event.id) &&
          eventMatchesRange(event, range.start, range.end),
      )
      .map(
        (event): LocalEventRecord => ({
          version: 2,
          id: event.id,
          event,
          isDemo: record.isDemo,
        }),
      );

    return instances.length > 0 ? [record, ...instances] : [];
  });
}
