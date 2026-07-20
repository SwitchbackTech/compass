import { type Collection, type Db, ObjectId } from "mongodb";
import {
  type ConnectionId,
  type PrincipalId,
  type ProviderCalendarId,
  type TenantId,
} from "@core/types/sync/identity.contracts";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";
import {
  type ProviderCalendarRecord,
  ProviderCalendarRecordSchema,
  type ProviderCalendarUpsert,
  ProviderCalendarUpsertSchema,
} from "@sync/storage/provider-calendar.record";

// Repository for `provider_calendars` (ledger S12). Upserts are keyed on
// (connection, provider-calendar id) so re-discovering a calendar updates one
// document; a renamed calendar keeps its Sync _id because identity is the
// provider's calendar id, not its display name (R-CAL-07). Queries are scoped
// to the owning tenant/principal (R-SEC-03).
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
}
