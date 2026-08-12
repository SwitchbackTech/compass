import { type ConnectionId } from "@core/types/sync/identity.contracts";
import {
  type AccessTokenSource,
  resolveAccessToken,
  runProviderWrite,
} from "@sync/domain/provider-write-ladder";
import { ProviderAuthError } from "@sync/providers/provider-auth.port";
import { ProviderWriteError } from "@sync/providers/provider-event-writer.port";
import { describe, expect, it } from "bun:test";

const connectionId = "507f1f77bcf86cd799439011" as ConnectionId;

describe("resolveAccessToken", () => {
  it("returns the token on success", async () => {
    const custody: AccessTokenSource = {
      getValidAccessToken: async () => "tok",
      discardRevoked: async () => {},
      invalidateAccessToken: async () => {},
    };
    await expect(resolveAccessToken(custody, connectionId)).resolves.toEqual({
      ok: true,
      accessToken: "tok",
    });
  });

  it("maps refreshFailed to pending", async () => {
    const custody: AccessTokenSource = {
      getValidAccessToken: async () => {
        throw new ProviderAuthError("refreshFailed", "blip");
      },
      discardRevoked: async () => {},
      invalidateAccessToken: async () => {},
    };
    await expect(resolveAccessToken(custody, connectionId)).resolves.toEqual({
      ok: false,
      stop: { kind: "pending" },
    });
  });

  it("maps other auth failures to authorizationRevoked", async () => {
    const custody: AccessTokenSource = {
      getValidAccessToken: async () => {
        throw new ProviderAuthError("authorizationRevoked", "gone");
      },
      discardRevoked: async () => {},
      invalidateAccessToken: async () => {},
    };
    await expect(resolveAccessToken(custody, connectionId)).resolves.toEqual({
      ok: false,
      stop: { kind: "failed", reason: "authorizationRevoked" },
    });
  });
});

describe("runProviderWrite", () => {
  it("returns the value on success", async () => {
    await expect(runProviderWrite(async () => 42)).resolves.toEqual({
      ok: true,
      value: 42,
    });
  });

  it("maps transient ProviderWriteError to pending", async () => {
    await expect(
      runProviderWrite(async () => {
        throw new ProviderWriteError("transient", "blip");
      }),
    ).resolves.toEqual({ ok: false, stop: { kind: "pending" } });
  });

  it("maps permanent ProviderWriteError to failed with that reason", async () => {
    await expect(
      runProviderWrite(async () => {
        throw new ProviderWriteError("permanentProviderError", "missing");
      }),
    ).resolves.toEqual({
      ok: false,
      stop: { kind: "failed", reason: "permanentProviderError" },
    });
  });

  it("rethrows unexpected errors", async () => {
    await expect(
      runProviderWrite(async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
  });
});
