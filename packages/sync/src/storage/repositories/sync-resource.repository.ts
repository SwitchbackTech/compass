import { type Collection, type Db, ObjectId } from "mongodb";
import { type SyncEventCalendarId } from "@core/types/sync/event.contracts";
import {
  type ConnectionId,
  type PrincipalId,
  type TenantId,
} from "@core/types/sync/identity.contracts";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";
import {
  type SyncResourceRecord,
  SyncResourceRecordSchema,
  type SyncResourceUpsert,
  SyncResourceUpsertSchema,
} from "@sync/storage/contracts/sync-resource.contracts";

interface SubscriptionInput {
  subscriptionId: string;
  subscriptionResourceId: string;
  subscriptionToken: string;
  subscriptionExpiresAt: Date;
}

// Repository for `sync_resources`. Each resource is created once per
// (connection, resourceKind, calendar) and then advanced as sync progresses.
// The incremental cursor is only moved after a whole batch succeeds; the page
// cursor holds mid-batch progress so an interrupted pull resumes rather than
// restarts.
export class SyncResourceRepository {
  private readonly collection: Collection<SyncResourceRecord>;

  constructor(db: Db) {
    this.collection = db.collection<SyncResourceRecord>(
      SYNC_COLLECTIONS.syncResources,
    );
  }

  async ensure(input: SyncResourceUpsert): Promise<SyncResourceRecord> {
    const fields = SyncResourceUpsertSchema.parse(input);
    const now = new Date();

    const result = await this.collection.findOneAndUpdate(
      {
        connectionId: fields.connectionId,
        resourceKind: fields.resourceKind,
        calendarId: fields.calendarId,
      },
      {
        $setOnInsert: {
          _id: new ObjectId().toHexString(),
          tenantId: fields.tenantId,
          principalId: fields.principalId,
          syncCursor: null,
          pageCursor: null,
          importGeneration: 0,
          activeGeneration: 0,
          lastAttemptAt: null,
          lastSuccessAt: null,
          subscriptionId: null,
          subscriptionResourceId: null,
          subscriptionToken: null,
          subscriptionExpiresAt: null,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true, returnDocument: "after" },
    );
    if (!result) throw new Error("Ensure did not return a sync resource");
    return SyncResourceRecordSchema.parse(result);
  }

  async markAttempt(
    tenantId: TenantId,
    principalId: PrincipalId,
    id: string,
    at: Date,
  ): Promise<void> {
    await this.collection.updateOne(
      { _id: id, tenantId, principalId },
      { $set: { lastAttemptAt: at, updatedAt: new Date() } },
    );
  }

  // Save mid-batch page progress without moving the incremental cursor.
  async setPageCheckpoint(
    tenantId: TenantId,
    principalId: PrincipalId,
    id: string,
    pageCursor: string,
  ): Promise<void> {
    await this.collection.updateOne(
      { _id: id, tenantId, principalId },
      { $set: { pageCursor, updatedAt: new Date() } },
    );
  }

  // Advance the incremental cursor after a batch fully commits, clearing the
  // mid-batch checkpoint and recording success.
  async advanceCursor(
    tenantId: TenantId,
    principalId: PrincipalId,
    id: string,
    syncCursor: string,
    succeededAt: Date,
  ): Promise<void> {
    await this.collection.updateOne(
      { _id: id, tenantId, principalId },
      {
        $set: {
          syncCursor,
          pageCursor: null,
          lastSuccessAt: succeededAt,
          updatedAt: new Date(),
        },
      },
    );
  }

  async updateSubscription(
    tenantId: TenantId,
    principalId: PrincipalId,
    id: string,
    subscription: SubscriptionInput,
  ): Promise<void> {
    await this.collection.updateOne(
      { _id: id, tenantId, principalId },
      { $set: { ...subscription, updatedAt: new Date() } },
    );
  }

  async clearSubscription(
    tenantId: TenantId,
    principalId: PrincipalId,
    id: string,
  ): Promise<void> {
    await this.collection.updateOne(
      { _id: id, tenantId, principalId },
      {
        $set: {
          subscriptionId: null,
          subscriptionResourceId: null,
          subscriptionToken: null,
          subscriptionExpiresAt: null,
          updatedAt: new Date(),
        },
      },
    );
  }

  // Find the resource a provider push channel belongs to. Keyed on the channel
  // (subscription) id alone — an inbound callback carries no tenant/principal,
  // and the channel id is unique — so authenticity is then checked against the
  // stored token by verifyNotification, not by this lookup.
  async findBySubscriptionId(
    subscriptionId: string,
  ): Promise<SyncResourceRecord | null> {
    const record = await this.collection.findOne({ subscriptionId });
    return record ? SyncResourceRecordSchema.parse(record) : null;
  }

  // Begin a fresh import generation for a non-destructive repair. The old
  // generation's data stays queryable until the replacement completes.
  async startNewGeneration(
    tenantId: TenantId,
    principalId: PrincipalId,
    id: string,
  ): Promise<number> {
    const result = await this.collection.findOneAndUpdate(
      { _id: id, tenantId, principalId },
      { $inc: { importGeneration: 1 }, $set: { updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    if (!result) throw new Error("startNewGeneration: resource not found");
    return SyncResourceRecordSchema.parse(result).importGeneration;
  }

  // Serve reads from the generation a repair just finished building. The flip is
  // a single field update, so reads switch from the old generation to the new
  // one atomically; the old generation's rows are cleaned up afterward.
  async activateGeneration(
    tenantId: TenantId,
    principalId: PrincipalId,
    id: string,
    generation: number,
  ): Promise<void> {
    await this.collection.updateOne(
      { _id: id, tenantId, principalId },
      { $set: { activeGeneration: generation, updatedAt: new Date() } },
    );
  }

  // The active generation to read for each of the given event calendars. A
  // calendar with no events resource yet (a cloud-only calendar, or one not
  // imported) is absent from the result; callers read generation 0 for those.
  async activeGenerationByCalendar(
    tenantId: TenantId,
    principalId: PrincipalId,
    calendarIds: readonly SyncEventCalendarId[],
  ): Promise<Map<SyncEventCalendarId, number>> {
    const records = await this.collection
      .find({
        tenantId,
        principalId,
        resourceKind: "events",
        calendarId: { $in: [...calendarIds] },
      })
      .project<{ calendarId: SyncEventCalendarId; activeGeneration: number }>({
        calendarId: 1,
        activeGeneration: 1,
      })
      .toArray();
    return new Map(records.map((r) => [r.calendarId, r.activeGeneration]));
  }

  async findById(
    tenantId: TenantId,
    principalId: PrincipalId,
    id: string,
  ): Promise<SyncResourceRecord | null> {
    const record = await this.collection.findOne({
      _id: id,
      tenantId,
      principalId,
    });
    return record ? SyncResourceRecordSchema.parse(record) : null;
  }

  async listByConnection(
    tenantId: TenantId,
    principalId: PrincipalId,
    connectionId: ConnectionId,
  ): Promise<SyncResourceRecord[]> {
    const records = await this.collection
      .find({ tenantId, principalId, connectionId })
      .toArray();
    return records.map((r) => SyncResourceRecordSchema.parse(r));
  }
}
