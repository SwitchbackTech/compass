import {
  decryptCredentialAtRest,
  encryptCredentialAtRest,
} from "./credential-at-rest";
import { describe, expect, it } from "bun:test";
import { randomBytes } from "node:crypto";

const key = randomBytes(32).toString("base64");

describe("credential at rest", () => {
  it("round-trips a password secret", () => {
    const secret = "apple-app-password-fixture";
    const sealed = encryptCredentialAtRest(key, secret);
    expect(sealed.ciphertext).not.toContain(secret);
    expect(decryptCredentialAtRest(key, sealed)).toBe(secret);
  });

  it("rejects a modified authentication tag", () => {
    const sealed = encryptCredentialAtRest(key, "secret");
    const tampered = { ...sealed, tag: `${sealed.tag.slice(0, -2)}AA` };
    expect(() => decryptCredentialAtRest(key, tampered)).toThrow();
  });

  it("rejects a different key", () => {
    const sealed = encryptCredentialAtRest(key, "secret");
    const otherKey = randomBytes(32).toString("base64");
    expect(() => decryptCredentialAtRest(otherKey, sealed)).toThrow();
  });
});
