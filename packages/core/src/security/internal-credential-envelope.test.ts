import {
  decryptInternalCredential,
  encryptInternalCredential,
} from "./internal-credential-envelope";
import { describe, expect, it } from "bun:test";

describe("internal credential envelope", () => {
  const context = {
    tenantId: "64b7f9c2e1a2b3c4d5e6f7a8",
    principalId: "64b7f9c2e1a2b3c4d5e6f7a8",
    account: {
      providerAccountId: "google-sub-1",
      email: "connected@example.com",
      displayName: "Connected User",
    },
    grantedScopes: ["https://www.googleapis.com/auth/calendar.events"],
  };

  it("round-trips a credential without exposing it in the envelope", () => {
    const credential = "server-exchanged-refresh-token";
    const envelope = encryptInternalCredential(
      "shared-secret",
      credential,
      context,
    );

    expect(JSON.stringify(envelope)).not.toContain(credential);
    expect(decryptInternalCredential("shared-secret", envelope, context)).toBe(
      credential,
    );
  });

  it("rejects a modified ciphertext", () => {
    const envelope = encryptInternalCredential(
      "shared-secret",
      "credential",
      context,
    );
    const modified = {
      ...envelope,
      ciphertext: `${envelope.ciphertext.slice(0, -2)}AA`,
    };

    expect(() =>
      decryptInternalCredential("shared-secret", modified, context),
    ).toThrow();
  });

  it("rejects a credential envelope replayed for another principal", () => {
    const envelope = encryptInternalCredential(
      "shared-secret",
      "credential",
      context,
    );

    expect(() =>
      decryptInternalCredential("shared-secret", envelope, {
        ...context,
        principalId: "64b7f9c2e1a2b3c4d5e6f7a9",
      }),
    ).toThrow();
    expect(() =>
      decryptInternalCredential("shared-secret", envelope, {
        ...context,
        grantedScopes: ["https://www.googleapis.com/auth/calendar.readonly"],
      }),
    ).toThrow();
  });
});
