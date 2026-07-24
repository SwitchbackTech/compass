import { type Collection, type Db, ObjectId } from "mongodb";
import {
  type ConnectionState,
  type ConnectionStateReason,
} from "@core/types/sync/connection.contracts";
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
} from "@sync/storage/contracts/provider-connection.contracts";

// Repository for `provider_connections`. Upserts are keyed on the
// stable provider-account identity so reconnecting the same account updates one
// document instead of creating a duplicate. Every query is scoped
// to a tenant/principal — one principal can never read another's connections.
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
          // A successful upsert-by-account-identity means the account is live —
          // a create or a reconnect — so clear any prior disconnect evidence.
          // This keeps disconnectedAt and state consistent: an upsert never
          // leaves a live state alongside a stale non-null disconnectedAt.
          disconnectedAt: null,
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

  // Record that the user disconnected this connection. Sets the durable
  // `disconnectedAt` evidence and the terminal state together (they agree:
  // state derivation maps a non-null disconnectedAt to "disconnected"). Scoped
  // to the owning principal, and returns whether a row was actually updated so
  // the caller can tell a real disconnect from a missing/foreign connection.
  async markDisconnected(
    tenantId: TenantId,
    principalId: PrincipalId,
    id: ConnectionId,
    now: Date = new Date(),
  ): Promise<boolean> {
    const result = await this.collection.updateOne(
      { _id: id, tenantId, principalId },
      {
        $set: {
          disconnectedAt: now,
          state: "disconnected",
          stateReason: null,
          updatedAt: now,
        },
      },
    );
    return result.matchedCount === 1;
  }

  // Persist a freshly derived user-facing state (and sync health timestamps).
  // Callers must pass a state already produced by deriveConnectionState — this
  // does not re-derive. Owner-scoped; returns the updated row.
  async updateDerivedState(
    tenantId: TenantId,
    principalId: PrincipalId,
    id: ConnectionId,
    fields: {
      state: ConnectionState;
      stateReason: ConnectionStateReason | null;
      lastSyncedAt: Date | null;
      lastHealthyAt: Date | null;
    },
    now: Date = new Date(),
  ): Promise<ProviderConnectionRecord> {
    const result = await this.collection.findOneAndUpdate(
      { _id: id, tenantId, principalId },
      {
        $set: {
          state: fields.state,
          stateReason: fields.stateReason,
          lastSyncedAt: fields.lastSyncedAt,
          lastHealthyAt: fields.lastHealthyAt,
          updatedAt: now,
        },
      },
      { returnDocument: "after" },
    );
    if (!result) {
      throw new Error("Connection not found while updating derived state");
    }
    return ProviderConnectionRecordSchema.parse(result);
  }
}
