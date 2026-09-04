import { sealOauthRefreshToken } from "@sync/credentials/oauth-refresh-at-rest";
import {
  type CredentialUpsert,
  type OauthRefreshCredentialRecord,
  type OauthRefreshStoredUpsert,
} from "@sync/storage/contracts/credential.contracts";
import { type CredentialRepository } from "@sync/storage/repositories/credential.repository";
import { Buffer } from "node:buffer";

// Stable 32-byte key for sync db tests that store encrypted credentials.
export const TEST_CREDENTIAL_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString(
  "base64",
);

export function toStoredOauthCredentialUpsert(
  keyBase64: string,
  input: CredentialUpsert,
): OauthRefreshStoredUpsert {
  const sealed = sealOauthRefreshToken(keyBase64, input.refreshToken);
  return {
    connectionId: input.connectionId,
    provider: input.provider,
    scopes: input.scopes,
    refreshTokenCiphertext: sealed.ciphertext,
    refreshTokenIv: sealed.iv,
    refreshTokenTag: sealed.tag,
    keyVersion: sealed.keyVersion,
  };
}

export async function seedOauthCredential(
  repo: CredentialRepository,
  input: CredentialUpsert,
): Promise<OauthRefreshCredentialRecord> {
  return repo.store(
    toStoredOauthCredentialUpsert(TEST_CREDENTIAL_ENCRYPTION_KEY, input),
  );
}
