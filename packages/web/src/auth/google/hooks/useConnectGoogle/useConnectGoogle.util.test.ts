import {
  formatLastSyncedLabel,
  formatLastUpdatedClause,
  getGoogleConnectionConfig,
  getGoogleSyncStatus,
  getSidebarSyncStatus,
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
      text: "Sync is catching up. Last updated 15 minutes ago. This usually clears on its own.",
    });
  });

  it("returns warning copy for ATTENTION without a connection summary", () => {
    expect(getGoogleSyncStatus("ATTENTION")).toEqual({
      variant: "warning",
      text: "Sync is stuck. Refresh your calendars, or reconnect if this continues.",
    });
  });

  it("returns error copy for RECONNECT_REQUIRED", () => {
    expect(getGoogleSyncStatus("RECONNECT_REQUIRED")).toEqual({
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
      text: "Sync is stuck. Last updated 15 minutes ago. Refresh your calendars, or reconnect if this continues.",
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
      text: "Sync hit an error. Last updated 15 minutes ago. Refresh your calendars, or reconnect if this continues.",
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
      text: "Sync is stuck. Last updated 15 minutes ago. Reconnect your calendar, or email tyler@switchback.tech for help.",
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
      text: "Sync is catching up",
    });
  });

  it("shows Sync is stuck for delayed workOverdue", () => {
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
      text: "Sync is stuck",
    });
  });

  it("shows Sync hit an error for delayed providerErrors", () => {
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
      text: "Sync hit an error",
    });
  });

  it("shows Calendar needs reconnecting for actionRequired", () => {
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
      text: "Calendar needs reconnecting",
    });
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
