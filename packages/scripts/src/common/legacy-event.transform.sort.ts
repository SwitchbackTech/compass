import { type EventRecord } from "@backend/event/event.record";

export type SomedaySortAssignmentInput = {
  record: EventRecord;
  sortOrderAssigned: boolean;
  legacyStartDate: string | null;
};

// Mutates `record.schedule.sortOrder` in place for every flagged (missing
// legacy `order`) someday record: existing explicit sortOrders keep their
// values; flagged ones are appended after the bucket's max, ordered by
// legacyStartDate then _id hex, bucketed by (calendarId, period, anchorDate).
export const assignMissingSomedaySortOrders = (
  results: SomedaySortAssignmentInput[],
): void => {
  const maxByBucket = new Map<string, number>();
  const flaggedByBucket = new Map<string, SomedaySortAssignmentInput[]>();

  for (const item of results) {
    const { schedule } = item.record;
    if (schedule.kind !== "someday") continue;

    const key = `${item.record.calendarId.toHexString()}:${schedule.period}:${schedule.anchorDate}`;
    if (item.sortOrderAssigned) {
      const bucket = flaggedByBucket.get(key) ?? [];
      bucket.push(item);
      flaggedByBucket.set(key, bucket);
    } else {
      maxByBucket.set(
        key,
        Math.max(maxByBucket.get(key) ?? -1, schedule.sortOrder),
      );
    }
  }

  for (const [key, bucket] of flaggedByBucket) {
    bucket.sort((a, b) => {
      const dateCompare = (a.legacyStartDate ?? "").localeCompare(
        b.legacyStartDate ?? "",
      );
      if (dateCompare !== 0) return dateCompare;
      return a.record._id
        .toHexString()
        .localeCompare(b.record._id.toHexString());
    });

    let next = (maxByBucket.get(key) ?? -1) + 1;
    for (const item of bucket) {
      const { schedule } = item.record;
      if (schedule.kind !== "someday") continue;
      schedule.sortOrder = next;
      next += 1;
    }
  }
};
