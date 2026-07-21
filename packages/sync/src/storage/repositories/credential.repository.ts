import { type Collection, type Db } from "mongodb";
import { type ConnectionId } from "@core/types/sync/identity.contracts";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";
import {
  type CredentialRecord,
  CredentialRecordSchema,
  type CredentialUpsert,
  CredentialUpsertSchema,
} from "@sync/storage/contracts/credential.contracts";

// Repository for `credentials`. One document per connection, keyed by the
// connection id. This is the ONLY place provider credentials are read or
// written; no connection query touches this collection, so a connection read
// can never surface a token. The repository never logs credential material.
export class CredentialRepository {
  private readonly collection: Collection<CredentialRecord>;

  constructor(db: Db) {
    this.collection = db.collection<CredentialRecord>(
      SYNC_COLLECTIONS.credentials,
    );
  }

  // Store or replace a connection's credential. A new refresh token clears any
  // cached access token, so a token minted from a superseded grant can never be
  // served after re-authorization.
  async store(input: CredentialUpsert): Promise<CredentialRecord> {
    const fields = CredentialUpsertSchema.parse(input);
    const now = new Date();

    const result = await this.collection.findOneAndUpdate(
      { _id: fields.connectionId },
      {
        $set: {
          provider: fields.provider,
          refreshToken: fields.refreshToken,
          scopes: fields.scopes,
          accessToken: null,
          accessTokenExpiresAt: null,
          updatedAt: now,
        },
        // _id comes from the query filter on insert; setting it here too would
        // touch the immutable field.
        $setOnInsert: { createdAt: now },
      },
      { upsert: true, returnDocument: "after" },
    );

    if (!result) {
      throw new Error("Credential store did not return a record");
    }
    return CredentialRecordSchema.parse(result);
  }

  async findByConnection(
    connectionId: ConnectionId,
  ): Promise<CredentialRecord | null> {
    const record = await this.collection.findOne({ _id: connectionId });
    return record ? CredentialRecordSchema.parse(record) : null;
  }

  // Cache a freshly-minted access token and its expiry. Returns null if the
  // credential was deleted concurrently (e.g. a disconnect landed mid-refresh),
  // so a caller never resurrects a revoked credential.
  async cacheAccessToken(
    connectionId: ConnectionId,
    accessToken: string,
    expiresAt: Date,
  ): Promise<CredentialRecord | null> {
    const result = await this.collection.findOneAndUpdate(
      { _id: connectionId },
      {
        $set: {
          accessToken,
          accessTokenExpiresAt: expiresAt,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    );
    return result ? CredentialRecordSchema.parse(result) : null;
  }

  // Remove a connection's credential (disconnect / account deletion). Returns
  // whether a credential existed to delete.
  async deleteByConnection(connectionId: ConnectionId): Promise<boolean> {
    const result = await this.collection.deleteOne({ _id: connectionId });
    return result.deletedCount > 0;
  }
}
