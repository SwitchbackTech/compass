import { type Collection, type Db, ObjectId } from "mongodb";
import {
  type ConnectionId,
  type PrincipalId,
  type TenantId,
} from "@core/types/sync/identity.contracts";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";
import {
  type ProviderConnectionRecord,
  ProviderConnectionRecordSchema,
  type ProviderConnectionUpsert,
  ProviderConnectionUpsertSchema,
} from "@sync/storage/provider-connection.record";

// Repository for `provider_connections` (ledger S12). Upserts are keyed on the
// stable provider-account identity so reconnecting the same account updates one
// document instead of creating a duplicate (R-CONN-02). Every query is scoped
// to a tenant/principal — one principal can never read another's connections
// (R-SEC-03).
export class ProviderConnectionRepository {
  private readonly collection: Collection<ProviderConnectionRecord>;

  constructor(db: Db) {
    this.collection = db.collection<ProviderConnectionRecord>(
      SYNC_COLLECTIONS.providerConnections,
    );
  }

  // Atomically create-or-update by (tenant, principal, provider, account). On
  // first sight Sync assigns _id and createdAt; on reconnect it updates the
  // mutable facts and leaves identity/creation untouched.
  async upsertByProviderAccount(
    input: ProviderConnectionUpsert,
  ): Promise<ProviderConnectionRecord> {
    const fields = ProviderConnectionUpsertSchema.parse(input);
    const now = new Date();

    const result = await this.collection.findOneAndUpdate(
      {
        tenantId: fields.tenantId,
        principalId: fields.principalId,
        provider: fields.provider,
        "account.providerAccountId": fields.account.providerAccountId,
      },
      {
        $set: {
          account: fields.account,
          capabilities: fields.capabilities,
          state: fields.state,
          stateReason: fields.stateReason,
          lastSyncedAt: fields.lastSyncedAt,
          lastHealthyAt: fields.lastHealthyAt,
          updatedAt: now,
        },
        $setOnInsert: {
          _id: new ObjectId().toHexString() as ConnectionId,
          tenantId: fields.tenantId,
          principalId: fields.principalId,
          provider: fields.provider,
          createdAt: now,
        },
      },
      { upsert: true, returnDocument: "after" },
    );

    if (!result) {
      throw new Error("Upsert did not return a connection record");
    }
    return ProviderConnectionRecordSchema.parse(result);
  }

  async findById(
    tenantId: TenantId,
    principalId: PrincipalId,
    id: ConnectionId,
  ): Promise<ProviderConnectionRecord | null> {
    const record = await this.collection.findOne({
      _id: id,
      tenantId,
      principalId,
    });
    return record ? ProviderConnectionRecordSchema.parse(record) : null;
  }

  async listByPrincipal(
    tenantId: TenantId,
    principalId: PrincipalId,
  ): Promise<ProviderConnectionRecord[]> {
    const records = await this.collection
      .find({ tenantId, principalId })
      .toArray();
    return records.map((r) => ProviderConnectionRecordSchema.parse(r));
  }
}
