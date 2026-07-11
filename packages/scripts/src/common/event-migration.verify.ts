import { transformLegacyEvent } from "@scripts/common/legacy-event.transform";
import { type Collection, type Document, type ObjectId } from "mongodb";
import { type CalendarRecord } from "@backend/calendar/calendar.record";
import { MONGO_BATCH_SIZE } from "@backend/common/constants/backend.constants";
import { type EventRecord } from "@backend/event/event.record";
import { createHash } from "node:crypto";

export type EventMigrationVerifyDeps = {
  legacyCollection: Collection<Document>;
  destinationCollection: Collection<EventRecord>;
  calendarCollection: Collection<CalendarRecord>;
  localCalendarIdByUser: Map<string, ObjectId>;
  primaryGoogleCalendarByUser: Map<
    string,
    { id: ObjectId; timeZone: string | null } | null
  >;
  legacyBaseIdsByUser: Map<string, Set<string>>;
  legacyUserOf: (legacyEvent: Document) => string | null;
};

export type EventMigrationVerifySummary = {
  legacyTotal: number;
  destinationTotal: number;
  categoryCounts: {
    legacy: Record<"timed" | "allDay" | "someday", number>;
    destination: Record<"timed" | "allDay" | "someday", number>;
  };
  seriesCount: number;
  occurrenceCount: number;
};

export type EventMigrationVerifyResult =
  | { ok: true; summary: EventMigrationVerifySummary }
  | {
      ok: false;
      mismatches: string[];
      summary: EventMigrationVerifySummary;
    };

const emptyCategoryCounts = (): Record<
  "timed" | "allDay" | "someday",
  number
> => ({
  timed: 0,
  allDay: 0,
  someday: 0,
});

// Behavior-bearing projection: fields the migration is contractually
// responsible for reproducing. Excludes createdAt/updatedAt, which are
// carried through best-effort and are not asserted bit-for-bit.
const projectionOf = (record: EventRecord): string =>
  JSON.stringify({
    _id: record._id.toHexString(),
    calendarId: record.calendarId.toHexString(),
    content: record.content,
    schedule: record.schedule,
    recurrence:
      record.recurrence.kind === "occurrence"
        ? {
            kind: "occurrence",
            seriesId: record.recurrence.seriesId.toHexString(),
          }
        : record.recurrence,
    priority: record.priority,
    externalReference: record.externalReference,
  });

// Streaming, order-independent hash: XOR the sha256 digest (as a bigint) of
// each record's projection so memory never holds more than one digest at a
// time, and result is independent of iteration order.
class StreamingProjectionHash {
  #acc = 0n;

  add(projection: string): void {
    const digest = createHash("sha256").update(projection).digest("hex");
    this.#acc ^= BigInt(`0x${digest}`);
  }

  hex(): string {
    return this.#acc.toString(16);
  }
}

export const verifyEventMigration = async (
  deps: EventMigrationVerifyDeps,
): Promise<EventMigrationVerifyResult> => {
  const {
    legacyCollection,
    destinationCollection,
    calendarCollection,
    localCalendarIdByUser,
    primaryGoogleCalendarByUser,
    legacyBaseIdsByUser,
    legacyUserOf,
  } = deps;

  const mismatches: string[] = [];

  const legacyTotal = await legacyCollection.countDocuments();
  const destinationTotal = await destinationCollection.countDocuments();

  const legacyCategoryCounts = emptyCategoryCounts();
  const destinationCategoryCounts = emptyCategoryCounts();

  const legacyHash = new StreamingProjectionHash();
  const destinationHash = new StreamingProjectionHash();

  // Re-run the pure transform over legacy in bounded batches to derive the
  // expected category counts and projection hash -- this is the source of
  // truth the destination must match.
  const legacyCursor = legacyCollection.find(
    {},
    { batchSize: MONGO_BATCH_SIZE },
  );
  let transformFailures = 0;
  for await (const legacyDoc of legacyCursor) {
    const userKey = legacyUserOf(legacyDoc);
    const localCalendarId = userKey
      ? localCalendarIdByUser.get(userKey)
      : undefined;
    const primaryGoogleCalendar = userKey
      ? (primaryGoogleCalendarByUser.get(userKey) ?? null)
      : null;
    const legacyBaseIds = userKey
      ? legacyBaseIdsByUser.get(userKey)
      : undefined;

    if (!localCalendarId) {
      transformFailures += 1;
      continue;
    }

    const result = transformLegacyEvent(legacyDoc, {
      localCalendarId,
      primaryGoogleCalendar,
      legacyBaseEventExists: (id) => legacyBaseIds?.has(id) ?? false,
    });

    if (!result.ok) {
      transformFailures += 1;
      continue;
    }

    legacyCategoryCounts[result.record.schedule.kind] += 1;
    legacyHash.add(projectionOf(result.record));
  }

  if (transformFailures > 0) {
    mismatches.push(
      `legacy re-transform produced ${transformFailures} failure(s) that the backfill should have already surfaced`,
    );
  }

  const destinationCursor = destinationCollection.find(
    {},
    { batchSize: MONGO_BATCH_SIZE },
  );
  let seriesCount = 0;
  let occurrenceCount = 0;
  const destinationIds = new Set<string>();
  const calendarIdCache = new Map<string, boolean>();
  const seriesIds: string[] = [];

  for await (const record of destinationCursor) {
    destinationCategoryCounts[record.schedule.kind] += 1;
    destinationIds.add(record._id.toHexString());
    destinationHash.add(projectionOf(record));

    if (record.recurrence.kind === "series") seriesCount += 1;
    if (record.recurrence.kind === "occurrence") {
      occurrenceCount += 1;
      seriesIds.push(record.recurrence.seriesId.toHexString());
    }

    const calendarKey = record.calendarId.toHexString();
    if (!calendarIdCache.has(calendarKey)) {
      const exists = await calendarCollection.countDocuments(
        { _id: record.calendarId },
        { limit: 1 },
      );
      calendarIdCache.set(calendarKey, exists > 0);
    }
    if (!calendarIdCache.get(calendarKey)) {
      mismatches.push(
        `orphan calendarId ${calendarKey} on event ${record._id.toHexString()}`,
      );
    }
  }

  for (const seriesId of seriesIds) {
    if (!destinationIds.has(seriesId)) {
      mismatches.push(
        `orphan recurrence.seriesId ${seriesId}: no matching destination _id`,
      );
    }
  }

  // Duplicate provider ids on the destination: the unique partial index
  // should make this structurally impossible, but assert it directly so a
  // regression in the index definition itself is caught here too.
  const duplicateProviderIds = await destinationCollection
    .aggregate<{
      _id: { calendarId: ObjectId; eventId: string };
      count: number;
    }>([
      { $match: { "externalReference.eventId": { $exists: true, $ne: null } } },
      {
        $group: {
          _id: {
            calendarId: "$calendarId",
            eventId: "$externalReference.eventId",
          },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray();

  for (const dup of duplicateProviderIds) {
    mismatches.push(
      `duplicate externalReference.eventId ${dup._id.eventId} on calendar ${dup._id.calendarId.toHexString()}`,
    );
  }

  if (legacyTotal - transformFailures !== destinationTotal) {
    mismatches.push(
      `count mismatch: legacy transformable=${legacyTotal - transformFailures} destination=${destinationTotal}`,
    );
  }

  (["timed", "allDay", "someday"] as const).forEach((kind) => {
    if (legacyCategoryCounts[kind] !== destinationCategoryCounts[kind]) {
      mismatches.push(
        `category "${kind}" mismatch: legacy=${legacyCategoryCounts[kind]} destination=${destinationCategoryCounts[kind]}`,
      );
    }
  });

  const legacyHashHex = legacyHash.hex();
  const destinationHashHex = destinationHash.hex();
  if (legacyHashHex !== destinationHashHex) {
    mismatches.push(
      `projection hash mismatch: legacy=${legacyHashHex} destination=${destinationHashHex}`,
    );
  }

  const summary: EventMigrationVerifySummary = {
    legacyTotal,
    destinationTotal,
    categoryCounts: {
      legacy: legacyCategoryCounts,
      destination: destinationCategoryCounts,
    },
    seriesCount,
    occurrenceCount,
  };

  if (mismatches.length > 0) return { ok: false, mismatches, summary };
  return { ok: true, summary };
};
