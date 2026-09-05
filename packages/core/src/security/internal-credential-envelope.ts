import {
  type CredentialConnectPayload,
  CredentialConnectPayloadSchema,
  type EncryptedCredentialEnvelope,
  EncryptedCredentialEnvelopeSchema,
  type ProviderAccountFacts,
} from "@core/types/sync/connection.contracts";
import { type ProviderKind } from "@core/types/sync/identity.contracts";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const ADOPT_GOOGLE_ROUTE =
  "POST /internal/connections/adopt-google-authorization";
const CREDENTIAL_CONNECT_ROUTE = "POST /internal/connections/credential";

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

export type CredentialConnectEnvelopeContext = {
  tenantId: string;
  principalId: string;
  provider: ProviderKind;
};

function additionalAuthenticatedData(
  route: string,
  context: GoogleConnectionCredentialContext | CredentialConnectEnvelopeContext,
): Buffer {
  if ("account" in context) {
    return Buffer.from(
      JSON.stringify({
        version: 1,
        route,
        tenantId: context.tenantId,
        principalId: context.principalId,
        account: context.account,
        grantedScopes: [...context.grantedScopes].sort(),
      }),
    );
  }
  return Buffer.from(
    JSON.stringify({
      version: 1,
      route,
      tenantId: context.tenantId,
      principalId: context.principalId,
      provider: context.provider,
    }),
  );
}

function encryptInternalPayload(
  secret: string,
  credential: string,
  route: string,
  context: GoogleConnectionCredentialContext | CredentialConnectEnvelopeContext,
): EncryptedCredentialEnvelope {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(secret), iv);
  cipher.setAAD(additionalAuthenticatedData(route, context));
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

function decryptInternalPayload(
  secret: string,
  envelope: EncryptedCredentialEnvelope,
  route: string,
  context: GoogleConnectionCredentialContext | CredentialConnectEnvelopeContext,
): string {
  const parsed = EncryptedCredentialEnvelopeSchema.parse(envelope);
  const decipher = createDecipheriv(
    ALGORITHM,
    encryptionKey(secret),
    Buffer.from(parsed.iv, "base64"),
  );
  decipher.setAAD(additionalAuthenticatedData(route, context));
  decipher.setAuthTag(Buffer.from(parsed.authTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(parsed.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

// Encrypt a credential before it crosses the Compass API → Sync service hop.
// The shared internal secret provides confidentiality and authentication even
// when the service mesh itself is configured with an http:// URL.
export function encryptInternalCredential(
  secret: string,
  credential: string,
  context: GoogleConnectionCredentialContext,
): EncryptedCredentialEnvelope {
  return encryptInternalPayload(
    secret,
    credential,
    ADOPT_GOOGLE_ROUTE,
    context,
  );
}

export function decryptInternalCredential(
  secret: string,
  envelope: EncryptedCredentialEnvelope,
  context: GoogleConnectionCredentialContext,
): string {
  return decryptInternalPayload(secret, envelope, ADOPT_GOOGLE_ROUTE, context);
}

export function encryptCredentialConnectPayload(
  secret: string,
  payload: CredentialConnectPayload,
  context: CredentialConnectEnvelopeContext,
): EncryptedCredentialEnvelope {
  const parsed = CredentialConnectPayloadSchema.parse(payload);
  return encryptInternalPayload(
    secret,
    JSON.stringify(parsed),
    CREDENTIAL_CONNECT_ROUTE,
    context,
  );
}

export function decryptCredentialConnectPayload(
  secret: string,
  envelope: EncryptedCredentialEnvelope,
  context: CredentialConnectEnvelopeContext,
): CredentialConnectPayload {
  const plaintext = decryptInternalPayload(
    secret,
    envelope,
    CREDENTIAL_CONNECT_ROUTE,
    context,
  );
  return CredentialConnectPayloadSchema.parse(JSON.parse(plaintext));
}
