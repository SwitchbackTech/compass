import { type Collection, type Db, type Filter, ObjectId } from "mongodb";
import {
  type ConnectionId,
  type PrincipalId,
  type ProviderCalendarId,
  type ProviderCalendarSourceId,
  type TenantId,
} from "@core/types/sync/identity.contracts";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";
import {
  type ProviderCalendarRecord,
  ProviderCalendarRecordSchema,
  type ProviderCalendarUpsert,
  ProviderCalendarUpsertSchema,
} from "@sync/storage/contracts/provider-calendar.contracts";

// Repository for `provider_calendars`. Upserts are keyed on
// (connection, provider-calendar id) so re-discovering a calendar updates one
// document; a renamed calendar keeps its Sync _id because identity is the
// provider's calendar id, not its display name. Queries are scoped
// to the owning tenant/principal.
export class ProviderCalendarRepository {
  private readonly collection: Collection<ProviderCalendarRecord>;

  constructor(db: Db) {
    this.collection = db.collection<ProviderCalendarRecord>(
      SYNC_COLLECTIONS.providerCalendars,
    );
  }

  async upsertByProviderCalendar(
    input: ProviderCalendarUpsert,
  ): Promise<ProviderCalendarRecord> {
    const fields = ProviderCalendarUpsertSchema.parse(input);
    const now = new Date();

    const result = await this.collection.findOneAndUpdate(
      {
        connectionId: fields.connectionId,
        providerCalendarId: fields.providerCalendarId,
      },
      {
        $set: {
          displayName: fields.displayName,
          color: fields.color,
          eventLabels: fields.eventLabels,
          active: fields.active,
          primary: fields.primary,
          accessRole: fields.accessRole,
          capabilities: fields.capabilities,
          updatedAt: now,
        },
        $setOnInsert: {
          _id: new ObjectId().toHexString() as ProviderCalendarId,
          tenantId: fields.tenantId,
          principalId: fields.principalId,
          connectionId: fields.connectionId,
          providerCalendarId: fields.providerCalendarId,
          createdAt: now,
        },
      },
      { upsert: true, returnDocument: "after" },
    );

    if (!result) {
      throw new Error("Upsert did not return a calendar record");
    }
    return ProviderCalendarRecordSchema.parse(result);
  }

  // Mark inactive every calendar of a connection whose provider id is NOT in
  // `presentProviderCalendarIds`, and return how many were changed. Used after a
  // FULL discovery pass to retire calendars the account no longer lists (an
  // incremental pass must not call this — absence there means "unchanged", not
  // "removed"). Marking inactive rather than deleting keeps a calendar's Sync _id
  // (and any downstream preferences) if it later returns. Owner-scoped.
  async deactivateAbsent(
    tenantId: TenantId,
    principalId: PrincipalId,
    connectionId: ConnectionId,
    presentProviderCalendarIds: readonly ProviderCalendarSourceId[],
  ): Promise<number> {
    const result = await this.collection.updateMany(
      {
        tenantId,
        principalId,
        connectionId,
        active: true,
        providerCalendarId: { $nin: [...presentProviderCalendarIds] },
      },
      { $set: { active: false, updatedAt: new Date() } },
    );
    return result.modifiedCount;
  }

  async listByConnection(
    tenantId: TenantId,
    principalId: PrincipalId,
    connectionId: ConnectionId,
  ): Promise<ProviderCalendarRecord[]> {
    const records = await this.collection
      .find({ tenantId, principalId, connectionId })
      .toArray();
    return records.map((r) => ProviderCalendarRecordSchema.parse(r));
  }

  async findById(
    tenantId: TenantId,
    principalId: PrincipalId,
    id: ProviderCalendarId,
  ): Promise<ProviderCalendarRecord | null> {
    const record = await this.collection.findOne({
      _id: id,
      tenantId,
      principalId,
    });
    return record ? ProviderCalendarRecordSchema.parse(record) : null;
  }

  // List a principal's calendars, optionally narrowed to one connection and/or
  // to active calendars only. Always scoped to the owning tenant/principal.
  async listByPrincipal(
    tenantId: TenantId,
    principalId: PrincipalId,
    filter: { connectionId?: ConnectionId; activeOnly?: boolean } = {},
  ): Promise<ProviderCalendarRecord[]> {
    const query: Filter<ProviderCalendarRecord> = { tenantId, principalId };
    if (filter.connectionId) query.connectionId = filter.connectionId;
    if (filter.activeOnly) query.active = true;

    const records = await this.collection.find(query).toArray();
    return records.map((r) => ProviderCalendarRecordSchema.parse(r));
  }

  // Hard-delete every calendar for one connection (post-disconnect retention).
  async deleteByConnection(
    tenantId: TenantId,
    principalId: PrincipalId,
    connectionId: ConnectionId,
  ): Promise<number> {
    const result = await this.collection.deleteMany({
      tenantId,
      principalId,
      connectionId,
    });
    return result.deletedCount;
  }

  // Hard-delete every calendar for a principal (account deletion).
  async deleteByPrincipal(
    tenantId: TenantId,
    principalId: PrincipalId,
  ): Promise<number> {
    const result = await this.collection.deleteMany({ tenantId, principalId });
    return result.deletedCount;
  }
}
