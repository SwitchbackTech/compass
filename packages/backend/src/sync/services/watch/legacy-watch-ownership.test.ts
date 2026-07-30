import { isLegacyGoogleWatchOwner } from "./legacy-watch-ownership";
import { describe, expect, it } from "bun:test";

describe("isLegacyGoogleWatchOwner", () => {
  it("is true when no Sync client is configured (the default test env)", () => {
    // getConnectionDelegation()/getEventDelegation() cache a client singleton
    // on first call, process-wide — a single test file can only reliably
    // observe one state, matching the pattern every other delegation test in
    // this suite uses. This file's own test process never sets
    // SYNC_SERVICE_URL, so both delegations stay "legacy".
    expect(isLegacyGoogleWatchOwner()).toBe(true);
  });
});
