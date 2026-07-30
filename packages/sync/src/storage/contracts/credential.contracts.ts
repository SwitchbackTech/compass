import { z } from "zod/v4";
import {
  ConnectionIdSchema,
  ProviderKindSchema,
} from "@core/types/sync/identity.contracts";

// Persistence record for `credentials`. Credentials live in their OWN
// collection, keyed 1:1 by connection id, so no normal connection projection
// can ever return credential material — reading a connection never touches this
// collection. Only the Sync database user can read it.
//
// The refresh token is the durable secret; the access token is a short-lived
// cache re-minted from it on demand. Both are token-shaped and must never reach
// a log or error — use `redactCredential` for any diagnostic output.
export const CredentialRecordSchema = z.strictObject({
  // One credential document per connection; the connection id is the key.
  _id: ConnectionIdSchema,
  provider: ProviderKindSchema,
  refreshToken: z.string().min(1),
  // Cached access token and its absolute expiry. Null until first refresh, and
  // whenever the cached token has been invalidated.
  accessToken: z.string().min(1).nullable(),
  accessTokenExpiresAt: z.date().nullable(),
  // The scopes the credential was granted, for capability checks.
  scopes: z.array(z.string()),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type CredentialRecord = z.infer<typeof CredentialRecordSchema>;

// What a caller provides to store or replace a connection's credential. Sync
// owns _id, createdAt, and updatedAt; _id doubles as connectionId, so it is
// picked back in under that name rather than omitted. Storing a fresh refresh
// token clears any cached access token so a stale one can never be served
// after re-authorization.
export const CredentialUpsertSchema = CredentialRecordSchema.pick({
  provider: true,
  refreshToken: true,
  scopes: true,
}).extend({ connectionId: ConnectionIdSchema });
export type CredentialUpsert = z.infer<typeof CredentialUpsertSchema>;

// A log-safe view of a credential. Token-shaped fields are reduced to presence
// booleans so a diagnostic can say "has a refresh token, access token expired"
// without ever emitting the secret. This is the ONLY shape that should be
// logged for a credential.
export interface RedactedCredential {
  readonly connectionId: string;
  readonly provider: string;
  readonly hasRefreshToken: boolean;
  readonly hasAccessToken: boolean;
  readonly accessTokenExpiresAt: Date | null;
  readonly scopeCount: number;
}

export function redactCredential(record: CredentialRecord): RedactedCredential {
  return {
    connectionId: record._id,
    provider: record.provider,
    hasRefreshToken: record.refreshToken.length > 0,
    hasAccessToken: record.accessToken !== null,
    accessTokenExpiresAt: record.accessTokenExpiresAt,
    scopeCount: record.scopes.length,
  };
}
