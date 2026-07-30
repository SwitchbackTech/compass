import { resolveEventDelegation } from "./event-routing";
import { describe, expect, it } from "bun:test";

describe("resolveEventDelegation", () => {
  it("delegates to sync when a client is configured", () => {
    expect(resolveEventDelegation({ hasSyncClient: true })).toBe("sync");
  });

  it("fails safe to legacy when no client is configured", () => {
    expect(resolveEventDelegation({ hasSyncClient: false })).toBe("legacy");
  });
});
