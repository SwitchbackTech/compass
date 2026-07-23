import { resolveConnectionDelegation } from "./connection-routing";
import { describe, expect, it } from "bun:test";

describe("resolveConnectionDelegation", () => {
  it("delegates to sync only when sync is selected and a client is configured", () => {
    expect(
      resolveConnectionDelegation({ routing: "sync", hasSyncClient: true }),
    ).toBe("sync");
  });

  it("stays legacy when legacy is selected", () => {
    expect(
      resolveConnectionDelegation({ routing: "legacy", hasSyncClient: true }),
    ).toBe("legacy");
    expect(
      resolveConnectionDelegation({ routing: "legacy", hasSyncClient: false }),
    ).toBe("legacy");
  });

  it("fails safe to legacy when sync is selected but no client is configured", () => {
    // Config validation should prevent this pairing, but the resolver must never
    // route to a missing client even if that guard is somehow bypassed.
    expect(
      resolveConnectionDelegation({ routing: "sync", hasSyncClient: false }),
    ).toBe("legacy");
  });
});
