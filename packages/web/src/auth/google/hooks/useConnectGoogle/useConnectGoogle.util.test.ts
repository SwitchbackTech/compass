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
      "Last synced just now",
    );
    expect(formatLastSyncedLabel("2026-07-24T11:59:00.000Z", nowMs)).toBe(
      "Last synced 1 minute ago",
    );
    expect(formatLastSyncedLabel("2026-07-24T11:45:00.000Z", nowMs)).toBe(
      "Last synced 15 minutes ago",
    );
    expect(formatLastSyncedLabel("2026-07-24T10:00:00.000Z", nowMs)).toBe(
      "Last synced 2 hours ago",
    );
    expect(formatLastSyncedLabel("2026-07-22T12:00:00.000Z", nowMs)).toBe(
      "Last synced 2 days ago",
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
      text: "Calendar up-to-date",
    });
  });

  it.each([
    "IMPORTING",
    "checking",
  ] as const)("returns syncing copy for %s", (state) => {
    expect(getGoogleSyncStatus(state)).toEqual({
      variant: "syncing",
      text: "Syncing your calendar…",
    });
  });

  it("returns warning copy for ATTENTION, without using the word 'repair'", () => {
    const status = getGoogleSyncStatus("ATTENTION");

    expect(status?.variant).toBe("warning");
    expect(status?.text.toLowerCase()).not.toContain("repair");
  });

  it("returns error copy for RECONNECT_REQUIRED", () => {
    expect(getGoogleSyncStatus("RECONNECT_REQUIRED")?.variant).toBe("error");
  });

  it("uses Sync catchingUp copy when a connection summary is present", () => {
    expect(
      getGoogleSyncStatus("IMPORTING", {
        id: "c1",
        state: "catchingUp",
        stateReason: null,
        lastSyncedAt: null,
        lastHealthyAt: null,
        accountEmail: "a@example.com",
      }),
    ).toEqual({
      variant: "syncing",
      text: "Catching up your calendar…",
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
      }),
    ).toEqual({
      variant: "warning",
      text: "Calendar sync is delayed",
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
      }),
    ).toEqual({
      variant: "healthy",
      text: "Calendar up-to-date",
    });
  });
});

describe("getGoogleConnectionConfig", () => {
  const onConnectGoogle = mock();

  beforeEach(() => {
    onConnectGoogle.mockClear();
  });

  it.each([
    "HEALTHY",
    "checking",
    "IMPORTING",
    "ATTENTION",
  ] as const)("returns no command action for %s", (state) => {
    expect(getGoogleConnectionConfig(state, onConnectGoogle)).toEqual({
      commandAction: null,
    });
  });

  it("wires NOT_CONNECTED to onConnectGoogle", () => {
    const config = getGoogleConnectionConfig("NOT_CONNECTED", onConnectGoogle);

    expect(config.commandAction?.label).toBe("Connect Google Calendar");
    config.commandAction?.onSelect?.();
    expect(onConnectGoogle).toHaveBeenCalledTimes(1);
  });

  it("wires RECONNECT_REQUIRED to onConnectGoogle", () => {
    const config = getGoogleConnectionConfig(
      "RECONNECT_REQUIRED",
      onConnectGoogle,
    );

    expect(config.commandAction?.label).toBe("Reconnect Google Calendar");
    config.commandAction?.onSelect?.();
    expect(onConnectGoogle).toHaveBeenCalledTimes(1);
  });
});
