import { describe, expect, it } from "bun:test";
import { toSyncPrincipal } from "./sync-principal";

describe("toSyncPrincipal", () => {
  it("maps a Compass user id to a personal tenant + principal (both the user id)", () => {
    const userId = "64b7f9c2e1a2b3c4d5e6f7a8";

    expect(toSyncPrincipal(userId)).toEqual({
      tenantId: userId,
      principalId: userId,
    });
  });
});
