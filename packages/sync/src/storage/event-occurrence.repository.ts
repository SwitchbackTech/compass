import { type Collection, type Db, type MongoClient, ObjectId } from "mongodb";
import { type EventId } from "@core/types/domain-primitives";
import { type SyncEventCalendarId } from "@core/types/sync/event.contracts";
import {
  type PrincipalId,
  type TenantId,
} from "@core/types/sync/identity.contracts";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";
import {
  type EventOccurrenceRecord,
  EventOccurrenceRecordSchema,
} from "@sync/storage/event-occurrence.record";

export type OccurrenceInput = Omit<EventOccurrenceRecord, "_id">;

export interface OccurrenceRangeCursor {
  startAt: Date;
  id: string;
}

export interface OccurrenceRangeQuery {
  tenantId: TenantId;
  principalId: PrincipalId;
  calendarIds: SyncEventCalendarId[];
  // Half-open [start, end) over the normalized start instant.
  start: Date;
  end: Date;
  limit: number;
  after?: OccurrenceRangeCursor;
}

// Repository for `event_occurrences`. Rebuilding a series' window
// replaces exactly that event's occurrences for the given generation, so a
// series edit rebuilds only the affected horizon. The range query is the
// bounded, keyset-paginated display projection.
export class EventOccurrenceRepository {
  private readonly collection: Collection<EventOccurrenceRecord>;

  // The client is needed to run the rebuild atomically in a transaction.
  constructor(
    db: Db,
    private readonly client: MongoClient,
  ) {
    this.collection = db.collection<EventOccurrenceRecord>(
      SYNC_COLLECTIONS.eventOccurrences,
    );
  }

  // Replace all occurrences for one event within a generation, atomically.
  // The delete+insert runs in a transaction so a concurrent range query never
  // observes the mid-rebuild empty window, and a failed insert rolls the delete
  // back (no lost occurrences). Scoped to (eventId, generation), so occurrences
  // of other events — and of the same event in another generation being built
  // by a repair — are never touched (never delete an old generation before its
  // replacement completes).
  async replaceForEvent(
    eventId: EventId,
    generation: number,
    occurrences: OccurrenceInput[],
  ): Promise<void> {
    const docs = occurrences.map((occurrence) =>
      EventOccurrenceRecordSchema.parse({
        _id: new ObjectId().toHexString(),
        ...occurrence,
      }),
    );

    const session = this.client.startSession();
    try {
      await session.withTransaction(async () => {
        await this.collection.deleteMany({ eventId, generation }, { session });
        if (docs.length > 0) {
          await this.collection.insertMany(docs, { session });
        }
      });
    } finally {
      await session.endSession();
    }
  }

  async listByCalendarRange(
    query: OccurrenceRangeQuery,
  ): Promise<EventOccurrenceRecord[]> {
    const scope = {
      tenantId: query.tenantId,
      principalId: query.principalId,
      calendarId: { $in: query.calendarIds },
    };
    const inRange = { startAt: { $gte: query.start, $lt: query.end } };

    // Composite keyset over the (startAt, _id) sort: a later instant, or the
    // same instant with a greater _id. startAt is a top-level Date and _id a
    // string, so this is fully typeable — no cast needed.
    const filter = query.after
      ? {
          ...scope,
          $and: [
            inRange,
            {
              $or: [
                { startAt: { $gt: query.after.startAt } },
                { startAt: query.after.startAt, _id: { $gt: query.after.id } },
              ],
            },
          ],
        }
      : { ...scope, ...inRange };

    const records = await this.collection
      .find(filter)
      .sort({ startAt: 1, _id: 1 })
      .limit(query.limit)
      .toArray();
    return records.map((r) => EventOccurrenceRecordSchema.parse(r));
  }
}
