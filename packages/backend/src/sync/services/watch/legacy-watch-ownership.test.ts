import { CONFIG } from "@backend/common/constants/config.constants";
import { isLegacyGoogleWatchOwner } from "./legacy-watch-ownership";
import { afterEach, describe, expect, it } from "bun:test";

describe("isLegacyGoogleWatchOwner", () => {
  const originalConnectionRouting = CONFIG.SYNC_CONNECTION_ROUTING;
  const originalEventRouting = CONFIG.SYNC_EVENT_ROUTING;

  afterEach(() => {
    CONFIG.SYNC_CONNECTION_ROUTING = originalConnectionRouting;
    CONFIG.SYNC_EVENT_ROUTING = originalEventRouting;
  });

  it("is true only when both connection and event routing are legacy", () => {
    CONFIG.SYNC_CONNECTION_ROUTING = "legacy";
    CONFIG.SYNC_EVENT_ROUTING = "legacy";
    expect(isLegacyGoogleWatchOwner()).toBe(true);

    CONFIG.SYNC_CONNECTION_ROUTING = "sync";
    CONFIG.SYNC_EVENT_ROUTING = "legacy";
    expect(isLegacyGoogleWatchOwner()).toBe(false);

    CONFIG.SYNC_CONNECTION_ROUTING = "legacy";
    CONFIG.SYNC_EVENT_ROUTING = "sync";
    expect(isLegacyGoogleWatchOwner()).toBe(false);

    CONFIG.SYNC_CONNECTION_ROUTING = "sync";
    CONFIG.SYNC_EVENT_ROUTING = "sync";
    expect(isLegacyGoogleWatchOwner()).toBe(false);
  });
});
