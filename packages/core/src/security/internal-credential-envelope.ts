import {
  type EncryptedCredentialEnvelope,
  EncryptedCredentialEnvelopeSchema,
  type ProviderAccountFacts,
} from "@core/types/sync/connection.contracts";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const ROUTE = "POST /internal/connections/adopt-google-authorization";

function encryptionKey(secret: string): Buffer {
  return createHash("sha256")
    .update("compass.internal-credential-envelope.v1")
    .update(secret)
    .digest();
}

export type GoogleConnectionCredentialContext = {
  tenantId: string;
  principalId: string;
  account: ProviderAccountFacts;
  grantedScopes: readonly string[];
};

// Bind every non-secret authorization fact to the credential. Any attempt to
// replay it under another principal or substitute an account/scope set fails
// AES-GCM authentication before Sync can persist a connection.
function additionalAuthenticatedData(
  context: GoogleConnectionCredentialContext,
): Buffer {
  return Buffer.from(
    JSON.stringify({
      version: 1,
      route: ROUTE,
      tenantId: context.tenantId,
      principalId: context.principalId,
      account: context.account,
      grantedScopes: [...context.grantedScopes].sort(),
    }),
  );
}

// Encrypt a credential before it crosses the Compass API → Sync service hop.
// The shared internal secret provides confidentiality and authentication even
// when the service mesh itself is configured with an http:// URL.
export function encryptInternalCredential(
  secret: string,
  credential: string,
  context: GoogleConnectionCredentialContext,
): EncryptedCredentialEnvelope {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(secret), iv);
  cipher.setAAD(additionalAuthenticatedData(context));
  const ciphertext = Buffer.concat([
    cipher.update(credential, "utf8"),
    cipher.final(),
  ]);
  return {
    iv: iv.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptInternalCredential(
  secret: string,
  envelope: EncryptedCredentialEnvelope,
  context: GoogleConnectionCredentialContext,
): string {
  const parsed = EncryptedCredentialEnvelopeSchema.parse(envelope);
  const decipher = createDecipheriv(
    ALGORITHM,
    encryptionKey(secret),
    Buffer.from(parsed.iv, "base64"),
  );
  decipher.setAAD(additionalAuthenticatedData(context));
  decipher.setAuthTag(Buffer.from(parsed.authTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(parsed.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
