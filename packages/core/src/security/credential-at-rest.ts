import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export const CREDENTIAL_AT_REST_KEY_VERSION = 1;

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

export type CredentialAtRest = {
  ciphertext: string;
  iv: string;
  tag: string;
  keyVersion: number;
};

export function decodeCredentialAtRestKey(keyBase64: string): Buffer {
  const key = Buffer.from(keyBase64, "base64");
  if (key.length !== KEY_LENGTH) {
    throw new Error("credential at-rest key must be 32 bytes of base64");
  }
  return key;
}

function additionalAuthenticatedData(keyVersion: number): Buffer {
  return Buffer.from(`compass.credential-at-rest.v${keyVersion}`);
}

export function encryptCredentialAtRest(
  keyBase64: string,
  plaintext: string,
  keyVersion: number = CREDENTIAL_AT_REST_KEY_VERSION,
): CredentialAtRest {
  const key = decodeCredentialAtRestKey(keyBase64);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(additionalAuthenticatedData(keyVersion));
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    keyVersion,
  };
}

export function decryptCredentialAtRest(
  keyBase64: string,
  payload: CredentialAtRest,
): string {
  const key = decodeCredentialAtRestKey(keyBase64);
  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(payload.iv, "base64"),
  );
  decipher.setAAD(additionalAuthenticatedData(payload.keyVersion));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
