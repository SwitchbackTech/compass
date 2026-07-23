import { CloudArrowUpIcon } from "@phosphor-icons/react";
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockUseConnectGoogle = mock();

mock.module("@web/auth/google/hooks/useConnectGoogle/useConnectGoogle", () => ({
  useConnectGoogle: mockUseConnectGoogle,
}));

async function importHook() {
  const moduleUrl = new URL(
    `./useCalendarSyncCmdItems.ts?test=${Math.random().toString(36).slice(2)}`,
    import.meta.url,
  );

  return import(moduleUrl.href) as Promise<
    typeof import("./useCalendarSyncCmdItems")
  >;
}

describe("useCalendarSyncCmdItems", () => {
  beforeEach(() => {
    mockUseConnectGoogle.mockReset();
  });

  it("returns no items when Google is unavailable", async () => {
    mockUseConnectGoogle.mockReturnValue({
      isAvailable: false,
      commandAction: null,
      state: "NOT_CONNECTED",
    });

    const { useCalendarSyncCmdItems } = await importHook();
    const { result } = renderHook(() => useCalendarSyncCmdItems());

    expect(result.current).toEqual({ items: [], syncStatus: null });
  });

  it("returns a keepOpen sync action when calendar needs attention", async () => {
    const onSelect = mock();
    mockUseConnectGoogle.mockReturnValue({
      isAvailable: true,
      commandAction: {
        label: "Sync Google Calendar",
        icon: CloudArrowUpIcon,
        onSelect,
      },
      state: "ATTENTION",
    });

    const { useCalendarSyncCmdItems } = await importHook();
    const { result } = renderHook(() => useCalendarSyncCmdItems());

    expect(result.current.items).toEqual([
      {
        id: "connect-google-calendar",
        label: "Sync Google Calendar",
        icon: CloudArrowUpIcon,
        onClick: onSelect,
        keepOpen: true,
      },
    ]);
    expect(result.current.syncStatus).toEqual({
      variant: "warning",
      text: "Calendar is out of date",
    });
  });

  it("does not keep the palette open for connect actions", async () => {
    const onSelect = mock();
    mockUseConnectGoogle.mockReturnValue({
      isAvailable: true,
      commandAction: {
        label: "Connect Google Calendar",
        icon: CloudArrowUpIcon,
        onSelect,
      },
      state: "NOT_CONNECTED",
    });

    const { useCalendarSyncCmdItems } = await importHook();
    const { result } = renderHook(() => useCalendarSyncCmdItems());

    expect(result.current.items[0]?.keepOpen).toBeUndefined();
  });

  it.each([
    "repairing",
    "IMPORTING",
    "checking",
  ] as const)("returns a disabled syncing row for %s", async (state) => {
    mockUseConnectGoogle.mockReturnValue({
      isAvailable: true,
      commandAction: null,
      state,
    });

    const { useCalendarSyncCmdItems } = await importHook();
    const { result } = renderHook(() => useCalendarSyncCmdItems());

    expect(result.current.items).toEqual([
      {
        id: "connect-google-calendar",
        label: "Syncing your calendar…",
        icon: CloudArrowUpIcon,
        iconClassName: "c-sync-icon-wave",
        disabled: true,
      },
    ]);
    expect(result.current.syncStatus?.variant).toBe("syncing");
  });
});
