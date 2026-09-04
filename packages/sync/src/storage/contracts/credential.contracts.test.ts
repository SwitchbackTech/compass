import { faker } from "@faker-js/faker";
import { type ConnectionId } from "@core/types/sync/identity.contracts";
import {
  CredentialRecordSchema,
  PasswordCredentialRecordSchema,
} from "./credential.contracts";
import { describe, expect, it } from "bun:test";

const objectId = () => faker.database.mongodbObjectId() as ConnectionId;

const oauthDoc = {
  _id: objectId(),
  provider: "google" as const,
  refreshToken: "refresh-token-secret",
  accessToken: null,
  accessTokenExpiresAt: null,
  refreshFailureCount: 0,
  scopes: ["https://www.googleapis.com/auth/calendar.events"],
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

describe("CredentialRecordSchema", () => {
  it("parses an existing fixture without credentialKind as oauthRefresh", () => {
    const parsed = CredentialRecordSchema.parse(oauthDoc);
    expect(parsed.credentialKind).toBe("oauthRefresh");
    if (parsed.credentialKind !== "oauthRefresh") {
      throw new Error("expected oauthRefresh");
    }
    expect(parsed.refreshToken).toBe("refresh-token-secret");
  });

  it("rejects a password row without ciphertext fields", () => {
    const result = CredentialRecordSchema.safeParse({
      credentialKind: "password",
      _id: objectId(),
      provider: "apple",
      username: "user@icloud.com",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(result.success).toBe(false);
    expect(
      PasswordCredentialRecordSchema.safeParse({
        credentialKind: "password",
        _id: objectId(),
        provider: "apple",
        username: "user@icloud.com",
        createdAt: new Date(),
        updatedAt: new Date(),
      }).success,
    ).toBe(false);
  });

  it("parses a password row with ciphertext fields", () => {
    const parsed = CredentialRecordSchema.parse({
      credentialKind: "password",
      _id: objectId(),
      provider: "apple",
      username: "user@icloud.com",
      secretCiphertext: "cipher",
      secretIv: "iv",
      secretTag: "tag",
      keyVersion: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(parsed.credentialKind).toBe("password");
  });
});
