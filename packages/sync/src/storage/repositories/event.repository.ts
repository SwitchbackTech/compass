import { type Collection, type Db, ObjectId } from "mongodb";
import { type EventId } from "@core/types/domain-primitives";
import { type SyncEventCalendarId } from "@core/types/sync/event.contracts";
import {
  type PrincipalId,
  type TenantId,
} from "@core/types/sync/identity.contracts";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";
import {
  type EventRecord,
  EventRecordSchema,
} from "@sync/storage/contracts/event.contracts";

// Fields for a provider-linked event upsert. Sync assigns _id/createdAt on
// first sight and dedupes on the (connection, calendar, providerEventId)
// identity so a repeated provider read never duplicates.
export type ProviderEventUpsert = Omit<
  EventRecord,
  "_id" | "createdAt" | "updatedAt"
> & {
  connectionId: NonNullable<EventRecord["connectionId"]>;
  providerEventId: NonNullable<EventRecord["providerEventId"]>;
};

export interface EventListQuery {
  tenantId: TenantId;
  principalId: PrincipalId;
  calendarId: SyncEventCalendarId;
  generation: number;
  limit: number;
  // Exclusive lower-bound _id for keyset pagination. Canonical events are
  // listed by id, not time — the time-ordered display projection is the
  // occurrence query. Uses the principal_calendar index.
  afterId?: EventId;
}

export class EventRepository {
  private readonly collection: Collection<EventRecord>;

  constructor(db: Db) {
    this.collection = db.collection<EventRecord>(SYNC_COLLECTIONS.events);
  }

  async upsertByProviderIdentity(
    input: ProviderEventUpsert,
  ): Promise<EventRecord> {
    const now = new Date();

    const result = await this.collection.findOneAndUpdate(
      {
        connectionId: input.connectionId,
        calendarId: input.calendarId,
        providerEventId: input.providerEventId,
      },
      {
        // input already omits _id/createdAt/updatedAt (see ProviderEventUpsert).
        $set: { ...input, updatedAt: now },
        $setOnInsert: {
          _id: new ObjectId().toHexString() as EventId,
          createdAt: now,
        },
      },
      { upsert: true, returnDocument: "after" },
    );
    if (!result) throw new Error("Upsert did not return an event record");
    return EventRecordSchema.parse(result);
  }

  // Full write of a Compass (or already-identified) event by its _id. Used for
  // unlinked cloud events and for promoting/relinking an existing event. The
  // filter is scoped to the owning tenant/principal, not _id alone: _id is the
  // client-supplied event id, so an unscoped replace would let one principal
  // overwrite another's event by reusing its id. Scoping means a foreign id
  // collides on the unique _id at insert (a caught error) instead of silently
  // clobbering the owner's document.
  async put(record: EventRecord): Promise<EventRecord> {
    const parsed = EventRecordSchema.parse(record);
    await this.collection.replaceOne(
      {
        _id: parsed._id,
        tenantId: parsed.tenantId,
        principalId: parsed.principalId,
      },
      parsed,
      { upsert: true },
    );
    return parsed;
  }

  async findById(
    tenantId: TenantId,
    principalId: PrincipalId,
    id: EventId,
  ): Promise<EventRecord | null> {
    const record = await this.collection.findOne({
      _id: id,
      tenantId,
      principalId,
    });
    return record ? EventRecordSchema.parse(record) : null;
  }

  // Remove one event by id, scoped to its owner so a caller can only delete its
  // own event. Idempotent: deleting an already-absent event is a no-op, so a
  // retried delete converges. Returns whether a document was removed.
  async deleteById(
    tenantId: TenantId,
    principalId: PrincipalId,
    id: EventId,
  ): Promise<boolean> {
    const result = await this.collection.deleteOne({
      _id: id,
      tenantId,
      principalId,
    });
    return result.deletedCount > 0;
  }

  // Bounded, keyset-paginated canonical events for one calendar/generation,
  // ordered by _id so a cursor never skips or repeats a row.
  async listByCalendar(query: EventListQuery): Promise<EventRecord[]> {
    const filter = {
      tenantId: query.tenantId,
      principalId: query.principalId,
      calendarId: query.calendarId,
      generation: query.generation,
      ...(query.afterId ? { _id: { $gt: query.afterId } } : {}),
    };

    const records = await this.collection
      .find(filter)
      .sort({ _id: 1 })
      .limit(query.limit)
      .toArray();
    return records.map((r) => EventRecordSchema.parse(r));
  }
}
