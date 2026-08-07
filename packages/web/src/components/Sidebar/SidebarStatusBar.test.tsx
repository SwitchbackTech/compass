import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type GoogleSyncConnectionSummary } from "@core/types/user.types";
import { createStoreWrapper } from "@web/__tests__/render-with-store";
import { seedPendingEventMutations } from "@web/__tests__/utils/event-query-test-data";
import { createMockConnection } from "@web/__tests__/utils/factories/calendar.factory";
import { type GoogleUiState } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle.types";
import { settingsActions } from "@web/settings/settings.store";
import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";

// mock.module is process-wide and not reliably restorable, so - as in
// AccountSectionHeader.test.tsx - the real hook is captured up front and a
// flag (flipped in afterAll) decides which one runs.
const actualUseConnectGoogle = (
  await import("@web/auth/google/hooks/useConnectGoogle/useConnectGoogle")
).useConnectGoogle;
let isConnectGoogleMocked = true;
let googleState: GoogleUiState = "HEALTHY";
let isConnecting = false;
let connection: GoogleSyncConnectionSummary | null = null;
mock.module("@web/auth/google/hooks/useConnectGoogle/useConnectGoogle", () => ({
  useConnectGoogle: (...args: Parameters<typeof actualUseConnectGoogle>) =>
    isConnectGoogleMocked
      ? {
          commandAction: null,
          connect: mock(),
          connection,
          refresh: mock(),
          isAvailable: true,
          isConnecting,
          isRefreshing: false,
          state: googleState,
        }
      : actualUseConnectGoogle(...args),
}));

const actualRefreshModule = await import(
  "@web/auth/google/state/google.sync.refresh"
);
let isRefreshSnapshotMocked = true;
mock.module("@web/auth/google/state/google.sync.refresh", () => ({
  ...actualRefreshModule,
  useGoogleSyncRefreshSnapshot: () =>
    isRefreshSnapshotMocked
      ? {
          isRefreshing: false,
          refreshRequestedAt: null,
          gaveUp: false,
        }
      : actualRefreshModule.useGoogleSyncRefreshSnapshot(),
}));

afterAll(() => {
  isConnectGoogleMocked = false;
  isRefreshSnapshotMocked = false;
});

const statusBarModuleUrl = new URL(
  `./SidebarStatusBar.tsx?test=${Math.random().toString(36).slice(2)}`,
  import.meta.url,
);
const { SidebarStatusBar } = (await import(
  statusBarModuleUrl.href
)) as typeof import("./SidebarStatusBar");

describe("SidebarStatusBar", () => {
  beforeEach(() => {
    googleState = "HEALTHY";
    isConnecting = false;
    connection = null;
  });

  it("shows 'Saving changes…' when a mutation is pending", () => {
    const { queryClient, wrapper } = createStoreWrapper();
    seedPendingEventMutations(queryClient, ["event-1"]);

    render(<SidebarStatusBar />, { wrapper });

    expect(screen.getByText("Saving changes…")).toBeInTheDocument();
  });

  it("reserves space for the status line when idle", () => {
    const { wrapper } = createStoreWrapper();

    render(<SidebarStatusBar />, { wrapper });

    const status = screen.getByRole("status");
    expect(status).toBeInTheDocument();
    expect(status.textContent).toBe("");
  });

  it("renders exactly one save status region, regardless of account count", () => {
    const { queryClient, wrapper } = createStoreWrapper();
    seedPendingEventMutations(queryClient, ["event-1"]);

    render(<SidebarStatusBar />, { wrapper });

    const regions = screen.getAllByRole("status");
    expect(regions).toHaveLength(1);
    expect(screen.getByText("Saving changes…")).toBeInTheDocument();
  });

  it("shows the aggregate Google sync status while a brand-new account's first import runs, so the calendar list below never shifts", () => {
    googleState = "IMPORTING";
    connection = createMockConnection("ahab@pequod.com", {
      state: "importing",
      lastHealthyAt: null,
      connectionState: "IMPORTING",
    });
    const { wrapper } = createStoreWrapper();

    render(<SidebarStatusBar />, { wrapper });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Adding your calendar…",
    );
  });

  it("stays quiet while an already-established account runs routine catch-up, not just on first import", () => {
    googleState = "IMPORTING";
    connection = createMockConnection("ahab@pequod.com", {
      state: "catchingUp",
      lastSyncedAt: new Date().toISOString(),
      lastHealthyAt: new Date().toISOString(),
      connectionState: "IMPORTING",
    });
    const { wrapper } = createStoreWrapper();

    render(<SidebarStatusBar />, { wrapper });

    expect(screen.getByRole("status").textContent).toBe("");
    expect(screen.queryByText("Adding your calendar…")).toBeNull();
  });

  it("shows Sync is catching up when catch-up is more than two minutes behind", () => {
    googleState = "IMPORTING";
    connection = createMockConnection("ahab@pequod.com", {
      state: "catchingUp",
      lastSyncedAt: new Date(Date.now() - 15 * 60_000).toISOString(),
      lastHealthyAt: new Date(Date.now() - 15 * 60_000).toISOString(),
      connectionState: "IMPORTING",
    });
    const { wrapper } = createStoreWrapper();

    render(<SidebarStatusBar />, { wrapper });

    expect(screen.getByRole("status")).toHaveTextContent("Sync is catching up");
    expect(screen.getByRole("button")).toHaveAttribute(
      "title",
      "Sync is catching up",
    );
  });

  it("shows Sync is stuck for delayed workOverdue", () => {
    googleState = "ATTENTION";
    connection = createMockConnection("ahab@pequod.com", {
      state: "delayed",
      stateReason: "workOverdue",
      lastSyncedAt: new Date(Date.now() - 20 * 60_000).toISOString(),
      lastHealthyAt: null,
      connectionState: "ATTENTION",
    });
    const { wrapper } = createStoreWrapper();

    render(<SidebarStatusBar />, { wrapper });

    expect(screen.getByRole("status")).toHaveTextContent("Sync is stuck");
  });

  it("opens Settings when the status bar is activated", async () => {
    const user = userEvent.setup();
    const openSettings = spyOn(settingsActions, "openSettings");
    googleState = "ATTENTION";
    connection = createMockConnection("ahab@pequod.com", {
      state: "delayed",
      stateReason: "workOverdue",
      connectionState: "ATTENTION",
    });
    const { wrapper } = createStoreWrapper();

    render(<SidebarStatusBar />, { wrapper });
    await user.click(
      screen.getByRole("button", {
        name: "Sync is stuck. Open account settings",
      }),
    );

    expect(openSettings).toHaveBeenCalledTimes(1);
    openSettings.mockRestore();
  });

  it("prefers 'Saving changes…' over the Google sync status when both are true", () => {
    googleState = "IMPORTING";
    connection = createMockConnection("ahab@pequod.com", {
      state: "importing",
      lastHealthyAt: null,
      connectionState: "IMPORTING",
    });
    const { queryClient, wrapper } = createStoreWrapper();
    seedPendingEventMutations(queryClient, ["event-1"]);

    render(<SidebarStatusBar />, { wrapper });

    expect(screen.getByRole("status")).toHaveTextContent("Saving changes…");
    expect(screen.queryByText("Adding your calendar…")).toBeNull();
  });

  it("stays empty when the aggregate Google state is healthy", () => {
    googleState = "HEALTHY";
    const { wrapper } = createStoreWrapper();

    render(<SidebarStatusBar />, { wrapper });

    expect(screen.getByRole("status").textContent).toBe("");
  });
});
