import { resolveConnectionDelegation } from "./connection-routing";
import { describe, expect, it } from "bun:test";

describe("resolveConnectionDelegation", () => {
  it("delegates to sync when a client is configured", () => {
    expect(resolveConnectionDelegation({ hasSyncClient: true })).toBe("sync");
  });

  it("fails safe to legacy when no client is configured", () => {
    expect(resolveConnectionDelegation({ hasSyncClient: false })).toBe(
      "legacy",
    );
  });
});
