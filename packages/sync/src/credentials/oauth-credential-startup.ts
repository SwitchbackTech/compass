import { type Db } from "mongodb";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";

export const PLAINTEXT_OAUTH_BOOT_MESSAGE =
  "plaintext OAuth credentials remain; run `bun run cli encrypt-credentials --apply`";

const MISSING_AT_REST_KEY =
  "stored credentials require sync.credentialEncryptionKey";

const PLAINTEXT_OAUTH_FILTER = {
  refreshToken: { $type: "string" as const },
  credentialKind: { $ne: "password" as const },
};

const STORED_OAUTH_FILTER = {
  credentialKind: { $ne: "password" as const },
  refreshTokenCiphertext: { $type: "string" as const },
};

export async function countPlaintextOauthRefreshCredentials(
  db: Db,
): Promise<number> {
  const row = await db
    .collection(SYNC_COLLECTIONS.credentials)
    .findOne(PLAINTEXT_OAUTH_FILTER, { projection: { _id: 1 } });
  return row ? 1 : 0;
}

export async function assertOauthCredentialStartupReady(
  db: Db,
  credentialEncryptionKey: string | undefined,
): Promise<void> {
  const hasPlaintext = await db
    .collection(SYNC_COLLECTIONS.credentials)
    .findOne(PLAINTEXT_OAUTH_FILTER, { projection: { _id: 1 } });
  if (hasPlaintext) {
    throw new Error(PLAINTEXT_OAUTH_BOOT_MESSAGE);
  }

  const hasStoredOauth = await db
    .collection(SYNC_COLLECTIONS.credentials)
    .findOne(STORED_OAUTH_FILTER, { projection: { _id: 1 } });
  if (hasStoredOauth && !credentialEncryptionKey) {
    throw new Error(MISSING_AT_REST_KEY);
  }
}
