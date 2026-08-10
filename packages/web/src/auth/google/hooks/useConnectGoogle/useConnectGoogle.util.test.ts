import { type GoogleSyncConnectionSummary } from "@core/types/user.types";
import {
  formatLastSyncedLabel,
  formatLastUpdatedClause,
  getGoogleConnectionConfig,
  getGoogleSyncStatus,
  getSidebarSyncStatus,
  isFirstImportInProgress,
} from "./useConnectGoogle.util";
import { beforeEach, describe, expect, it, mock } from "bun:test";

describe("formatLastSyncedLabel", () => {
  const nowMs = Date.parse("2026-07-24T12:00:00.000Z");

  it("returns null when lastSyncedAt is missing or invalid", () => {
    expect(formatLastSyncedLabel(null, nowMs)).toBeNull();
    expect(formatLastSyncedLabel(undefined, nowMs)).toBeNull();
    expect(formatLastSyncedLabel("not-a-date", nowMs)).toBeNull();
  });

  it("formats recent relative ages", () => {
    expect(formatLastSyncedLabel("2026-07-24T11:59:30.000Z", nowMs)).toBe(
      "Updated just now",
    );
    expect(formatLastSyncedLabel("2026-07-24T11:59:00.000Z", nowMs)).toBe(
      "Updated 1 minute ago",
    );
    expect(formatLastSyncedLabel("2026-07-24T11:45:00.000Z", nowMs)).toBe(
      "Updated 15 minutes ago",
    );
    expect(formatLastSyncedLabel("2026-07-24T10:00:00.000Z", nowMs)).toBe(
      "Updated 2 hours ago",
    );
    expect(formatLastSyncedLabel("2026-07-22T12:00:00.000Z", nowMs)).toBe(
      "Updated 2 days ago",
    );
  });

  it("formats the mid-sentence Last updated clause", () => {
    expect(formatLastUpdatedClause("2026-07-24T11:45:00.000Z", nowMs)).toBe(
      "Last updated 15 minutes ago",
    );
  });
});

describe("getGoogleSyncStatus", () => {
  const nowMs = Date.parse("2026-07-24T12:00:00.000Z");

  it("returns no sync status when Google is not connected", () => {
    expect(getGoogleSyncStatus("NOT_CONNECTED")).toBeNull();
  });

  it("returns healthy copy for connected Google", () => {
    expect(getGoogleSyncStatus("HEALTHY")).toEqual({
      variant: "healthy",
      text: "Calendar connected",
    });
  });

  it("hides transient metadata loading without a connection summary", () => {
    expect(getGoogleSyncStatus("checking")).toBeNull();
  });

  it("uses setup copy while importing", () => {
    expect(getGoogleSyncStatus("IMPORTING")).toEqual({
      variant: "syncing",
      text: "Adding your calendar…",
    });
  });

  it("keeps a cached healthy connection calm while metadata loads", () => {
    expect(
      getGoogleSyncStatus("checking", {
        id: "c1",
        state: "healthy",
        stateReason: null,
        lastSyncedAt: "2026-07-24T12:00:00.000Z",
        lastHealthyAt: "2026-07-24T12:00:00.000Z",
        accountEmail: "a@example.com",
        connectionState: "HEALTHY",
      }),
    ).toEqual({
      variant: "healthy",
      text: "Calendar connected",
    });
  });

  it("keeps recent catchingUp calm in Settings", () => {
    expect(
      getGoogleSyncStatus(
        "IMPORTING",
        {
          id: "c1",
          state: "catchingUp",
          stateReason: null,
          lastSyncedAt: "2026-07-24T11:59:00.000Z",
          lastHealthyAt: "2026-07-24T11:59:00.000Z",
          accountEmail: "a@example.com",
          connectionState: "IMPORTING",
        },
        nowMs,
      ),
    ).toEqual({
      variant: "healthy",
      text: "Calendar connected",
    });
  });

  it("explains catchingUp that is more than two minutes behind", () => {
    expect(
      getGoogleSyncStatus(
        "IMPORTING",
        {
          id: "c1",
          state: "catchingUp",
          stateReason: null,
          lastSyncedAt: "2026-07-24T11:45:00.000Z",
          lastHealthyAt: "2026-07-24T11:45:00.000Z",
          accountEmail: "a@example.com",
          connectionState: "IMPORTING",
        },
        nowMs,
      ),
    ).toEqual({
      variant: "syncing",
      text: "Syncing in the background… Last updated 15 minutes ago. This usually finishes on its own.",
    });
  });

  it("returns warning copy for ATTENTION without a connection summary", () => {
    expect(getGoogleSyncStatus("ATTENTION")).toEqual({
      variant: "warning",
      text: "Calendar updates are taking longer than usual. Try Refresh, or reconnect if this continues.",
    });
  });

  it("returns error copy for RECONNECT_REQUIRED", () => {
    expect(getGoogleSyncStatus("RECONNECT_REQUIRED")).toEqual({
      variant: "error",
      text: "Calendar needs reconnecting",
    });
  });

  it("keeps reconnect-required over a lagging Sync catchingUp/healthy summary", () => {
    expect(
      getGoogleSyncStatus(
        "RECONNECT_REQUIRED",
        {
          id: "c1",
          state: "catchingUp",
          stateReason: null,
          lastSyncedAt: "2026-07-24T11:45:00.000Z",
          lastHealthyAt: "2026-07-24T11:45:00.000Z",
          accountEmail: "a@example.com",
          connectionState: "IMPORTING",
        },
        nowMs,
      ),
    ).toEqual({
      variant: "error",
      text: "Calendar needs reconnecting",
    });

    expect(
      getGoogleSyncStatus("HEALTHY", {
        id: "c1",
        state: "healthy",
        stateReason: null,
        lastSyncedAt: "2026-07-24T12:00:00.000Z",
        lastHealthyAt: "2026-07-24T12:00:00.000Z",
        accountEmail: "a@example.com",
        connectionState: "RECONNECT_REQUIRED",
      }),
    ).toEqual({
      variant: "error",
      text: "Calendar needs reconnecting",
    });
  });

  it("shows setup copy for a connection that has never been healthy", () => {
    expect(
      getGoogleSyncStatus("IMPORTING", {
        id: "c1",
        state: "catchingUp",
        stateReason: null,
        lastSyncedAt: null,
        lastHealthyAt: null,
        accountEmail: "a@example.com",
        connectionState: "IMPORTING",
      }),
    ).toEqual({
      variant: "syncing",
      text: "Adding your calendar…",
    });
  });

  it("uses stuck copy for delayed workOverdue", () => {
    expect(
      getGoogleSyncStatus(
        "ATTENTION",
        {
          id: "c1",
          state: "delayed",
          stateReason: "workOverdue",
          lastSyncedAt: "2026-07-24T11:45:00.000Z",
          lastHealthyAt: null,
          accountEmail: null,
          connectionState: "ATTENTION",
        },
        nowMs,
      ),
    ).toEqual({
      variant: "warning",
      text: "Calendar updates are taking longer than usual. Last updated 15 minutes ago. Try Refresh, or reconnect if this continues.",
    });
  });

  it("uses error copy for delayed providerErrors", () => {
    expect(
      getGoogleSyncStatus(
        "ATTENTION",
        {
          id: "c1",
          state: "delayed",
          stateReason: "providerErrors",
          lastSyncedAt: "2026-07-24T11:45:00.000Z",
          lastHealthyAt: null,
          accountEmail: null,
          connectionState: "ATTENTION",
        },
        nowMs,
      ),
    ).toEqual({
      variant: "warning",
      text: "Couldn't update your calendar. Last updated 15 minutes ago. Try Refresh, or reconnect if this continues.",
    });
  });

  it("admits stuck after a refresh gave up", () => {
    expect(
      getGoogleSyncStatus(
        "ATTENTION",
        {
          id: "c1",
          state: "delayed",
          stateReason: "workOverdue",
          lastSyncedAt: "2026-07-24T11:45:00.000Z",
          lastHealthyAt: null,
          accountEmail: null,
          connectionState: "ATTENTION",
        },
        nowMs,
        { refreshGaveUp: true },
      ),
    ).toEqual({
      variant: "error",
      text: "We couldn't update your calendar. Last updated 15 minutes ago. Reconnect, or email tyler@switchback.tech for help.",
    });
  });
});

describe("getSidebarSyncStatus", () => {
  const nowMs = Date.parse("2026-07-24T12:00:00.000Z");

  it("stays silent for recent catchingUp", () => {
    expect(
      getSidebarSyncStatus({
        connection: {
          id: "c1",
          state: "catchingUp",
          stateReason: null,
          lastSyncedAt: "2026-07-24T11:59:00.000Z",
          lastHealthyAt: "2026-07-24T11:59:00.000Z",
          accountEmail: "a@example.com",
          connectionState: "IMPORTING",
        },
        isConnecting: false,
        state: "IMPORTING",
        nowMs,
      }),
    ).toBeNull();
  });

  it("shows short catching-up copy when behind more than two minutes", () => {
    expect(
      getSidebarSyncStatus({
        connection: {
          id: "c1",
          state: "catchingUp",
          stateReason: null,
          lastSyncedAt: "2026-07-24T11:45:00.000Z",
          lastHealthyAt: "2026-07-24T11:45:00.000Z",
          accountEmail: "a@example.com",
          connectionState: "IMPORTING",
        },
        isConnecting: false,
        state: "IMPORTING",
        nowMs,
      }),
    ).toEqual({
      variant: "syncing",
      text: "Syncing in the background…",
    });
  });

  it("shows Calendar updates are delayed for delayed workOverdue", () => {
    expect(
      getSidebarSyncStatus({
        connection: {
          id: "c1",
          state: "delayed",
          stateReason: "workOverdue",
          lastSyncedAt: "2026-07-24T11:45:00.000Z",
          lastHealthyAt: null,
          accountEmail: null,
          connectionState: "ATTENTION",
        },
        isConnecting: false,
        state: "ATTENTION",
        nowMs,
      }),
    ).toEqual({
      variant: "warning",
      text: "Calendar updates are delayed",
    });
  });

  it("shows Syncing in the background while a Refresh is in flight on delayed", () => {
    expect(
      getSidebarSyncStatus({
        connection: {
          id: "c1",
          state: "delayed",
          stateReason: "workOverdue",
          lastSyncedAt: "2026-07-24T11:45:00.000Z",
          lastHealthyAt: null,
          accountEmail: null,
          connectionState: "ATTENTION",
        },
        isConnecting: false,
        state: "ATTENTION",
        nowMs,
        refreshInFlight: true,
      }),
    ).toEqual({
      variant: "syncing",
      text: "Syncing in the background…",
    });
  });

  it("shows Couldn't update your calendar for delayed providerErrors", () => {
    expect(
      getSidebarSyncStatus({
        connection: {
          id: "c1",
          state: "delayed",
          stateReason: "providerErrors",
          lastSyncedAt: "2026-07-24T11:45:00.000Z",
          lastHealthyAt: null,
          accountEmail: null,
          connectionState: "ATTENTION",
        },
        isConnecting: false,
        state: "ATTENTION",
        nowMs,
      }),
    ).toEqual({
      variant: "warning",
      text: "Couldn't update your calendar",
    });
  });

  it("names the account for actionRequired, so multiple accounts don't collapse into one anonymous warning", () => {
    expect(
      getSidebarSyncStatus({
        connection: {
          id: "c1",
          state: "actionRequired",
          stateReason: "authorizationRevoked",
          lastSyncedAt: null,
          lastHealthyAt: null,
          accountEmail: "a@example.com",
          connectionState: "RECONNECT_REQUIRED",
        },
        isConnecting: false,
        state: "RECONNECT_REQUIRED",
        nowMs,
      }),
    ).toEqual({
      variant: "error",
      text: "a@example.com needs reconnecting",
    });
  });

  it("falls back to the generic reconnect text with no account email to name", () => {
    expect(
      getSidebarSyncStatus({
        connection: {
          id: "c1",
          state: "actionRequired",
          stateReason: "authorizationRevoked",
          lastSyncedAt: null,
          lastHealthyAt: null,
          accountEmail: null,
          connectionState: "RECONNECT_REQUIRED",
        },
        isConnecting: false,
        state: "RECONNECT_REQUIRED",
        nowMs,
      }),
    ).toEqual({
      variant: "error",
      text: "Calendar needs reconnecting",
    });
  });
});

describe("isFirstImportInProgress", () => {
  const makeConnection = (
    overrides: Partial<GoogleSyncConnectionSummary> = {},
  ): GoogleSyncConnectionSummary => ({
    id: "c1",
    state: "importing",
    stateReason: null,
    lastSyncedAt: null,
    lastHealthyAt: null,
    accountEmail: "a@example.com",
    connectionState: "IMPORTING",
    ...overrides,
  });

  it("returns false with no connection", () => {
    expect(isFirstImportInProgress(null)).toBe(false);
    expect(isFirstImportInProgress(undefined)).toBe(false);
  });

  it.each([
    "connecting",
    "importing",
    "catchingUp",
  ] as const)("returns true for a never-healthy connection in state %s", (state) => {
    expect(
      isFirstImportInProgress(makeConnection({ state, lastHealthyAt: null })),
    ).toBe(true);
  });

  it("returns false once the connection has ever gone healthy, even mid-catchingUp", () => {
    // This is the exact bug it fixes: an established account's ROUTINE
    // catch-up collapses to the same aggregate IMPORTING state as a brand-new
    // account's first import - lastHealthyAt is the only signal that tells
    // them apart.
    expect(
      isFirstImportInProgress(
        makeConnection({
          state: "catchingUp",
          lastHealthyAt: "2026-07-24T11:45:00.000Z",
        }),
      ),
    ).toBe(false);
  });

  it("returns false for a healthy connection", () => {
    expect(
      isFirstImportInProgress(
        makeConnection({
          state: "healthy",
          lastHealthyAt: "2026-07-24T11:45:00.000Z",
        }),
      ),
    ).toBe(false);
  });

  it("returns false for a delayed/reconnect-needed state, even if never healthy", () => {
    expect(
      isFirstImportInProgress(
        makeConnection({ state: "delayed", lastHealthyAt: null }),
      ),
    ).toBe(false);
    expect(
      isFirstImportInProgress(
        makeConnection({ state: "actionRequired", lastHealthyAt: null }),
      ),
    ).toBe(false);
  });
});

describe("getGoogleConnectionConfig", () => {
  const onConnectGoogle = mock();
  const onRefreshGoogle = mock();
  const handlers = { onConnectGoogle, onRefreshGoogle };

  beforeEach(() => {
    onConnectGoogle.mockClear();
    onRefreshGoogle.mockClear();
  });

  it.each([
    "HEALTHY",
    "checking",
    "IMPORTING",
  ] as const)("returns no command action for %s", (state) => {
    expect(getGoogleConnectionConfig(state, handlers)).toEqual({
      commandAction: null,
    });
  });

  it("wires ATTENTION to onRefreshGoogle", () => {
    const config = getGoogleConnectionConfig("ATTENTION", handlers);

    expect(config.commandAction?.label).toBe("Refresh calendar");
    config.commandAction?.onSelect?.();
    expect(onRefreshGoogle).toHaveBeenCalledTimes(1);
    expect(onConnectGoogle).not.toHaveBeenCalled();
  });

  it("replaces Refresh with Reconnect after a refresh gave up", () => {
    const config = getGoogleConnectionConfig("ATTENTION", handlers, {
      refreshGaveUp: true,
    });

    expect(config.commandAction?.label).toBe("Reconnect Google Calendar");
    config.commandAction?.onSelect?.();
    expect(onConnectGoogle).toHaveBeenCalledTimes(1);
    expect(onRefreshGoogle).not.toHaveBeenCalled();
  });

  it("wires NOT_CONNECTED to onConnectGoogle", () => {
    const config = getGoogleConnectionConfig("NOT_CONNECTED", handlers);

    expect(config.commandAction?.label).toBe("Connect Google Calendar");
    config.commandAction?.onSelect?.();
    expect(onConnectGoogle).toHaveBeenCalledTimes(1);
  });

  it("wires RECONNECT_REQUIRED to onConnectGoogle", () => {
    const config = getGoogleConnectionConfig("RECONNECT_REQUIRED", handlers);

    expect(config.commandAction?.label).toBe("Reconnect Google Calendar");
    config.commandAction?.onSelect?.();
    expect(onConnectGoogle).toHaveBeenCalledTimes(1);
  });
});
