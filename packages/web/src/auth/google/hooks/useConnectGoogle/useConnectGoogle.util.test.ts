import {
  formatLastSyncedLabel,
  getGoogleConnectionConfig,
  getGoogleSyncStatus,
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
});

describe("getGoogleSyncStatus", () => {
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

  it("keeps a cached healthy connection calm during a routine refresh", () => {
    expect(
      getGoogleSyncStatus("IMPORTING", {
        id: "c1",
        state: "healthy",
        stateReason: null,
        lastSyncedAt: "2026-07-24T12:00:00.000Z",
        lastHealthyAt: "2026-07-24T12:00:00.000Z",
        accountEmail: "a@example.com",
        connectionState: "IMPORTING",
      }),
    ).toEqual({
      variant: "healthy",
      text: "Calendar connected",
    });
  });

  it("returns warning copy for ATTENTION, without using the word 'repair'", () => {
    const status = getGoogleSyncStatus("ATTENTION");

    expect(status?.variant).toBe("warning");
    expect(status?.text).toBe(
      "Calendar updates are taking longer than usual. We'll keep trying.",
    );
  });

  it("returns error copy for RECONNECT_REQUIRED", () => {
    expect(getGoogleSyncStatus("RECONNECT_REQUIRED")?.variant).toBe("error");
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

  it("uses Sync delayed copy when a connection summary is present", () => {
    expect(
      getGoogleSyncStatus("ATTENTION", {
        id: "c1",
        state: "delayed",
        stateReason: "workOverdue",
        lastSyncedAt: "2026-07-24T12:00:00.000Z",
        lastHealthyAt: null,
        accountEmail: null,
        connectionState: "ATTENTION",
      }),
    ).toEqual({
      variant: "warning",
      text: "Calendar updates are taking longer than usual. We'll keep trying.",
    });
  });

  it("uses Sync healthy copy from the connection summary", () => {
    expect(
      getGoogleSyncStatus("HEALTHY", {
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
