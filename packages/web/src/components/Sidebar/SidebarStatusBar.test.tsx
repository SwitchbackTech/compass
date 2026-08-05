import { render, screen } from "@testing-library/react";
import { type GoogleSyncConnectionSummary } from "@core/types/user.types";
import { createStoreWrapper } from "@web/__tests__/render-with-store";
import { seedPendingEventMutations } from "@web/__tests__/utils/event-query-test-data";
import { createMockConnection } from "@web/__tests__/utils/factories/calendar.factory";
import { type GoogleUiState } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle.types";
import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";

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

afterAll(() => {
  isConnectGoogleMocked = false;
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
    // The 2026-08-05 bug this guards against: the aggregate connectionState
    // collapses first-import and routine incremental catch-up to the same
    // "IMPORTING" value, so without the connection's own lastHealthyAt the
    // bar would misreport a healthy account's reconciliation as "Adding your
    // calendar…" - exactly the noise getSidebarSyncStatus is meant to hide.
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
