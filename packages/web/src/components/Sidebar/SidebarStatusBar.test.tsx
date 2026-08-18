import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type GoogleSyncConnectionSummary } from "@core/types/user.types";
import { createStoreWrapper } from "@web/__tests__/render-with-store";
import { seedPendingEventMutations } from "@web/__tests__/utils/event-query-test-data";
import { createMockConnection } from "@web/__tests__/utils/factories/calendar.factory";
import { type GoogleUiState } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle.types";
import {
  createGridEventDraft,
  timedGridSchedule,
} from "@web/events/grid-event-draft.adapter";
import { draftActions } from "@web/events/stores/draft.store";
import {
  edgeFocusActions,
  initialEdgeFocusState,
  useEdgeFocusStore,
} from "@web/grid/shortcuts/edge-focus.store";
import { KEYBOARD_PLACE_HINT_PARTS } from "@web/grid/shortcuts/KeyboardPlaceIndicator";
import { settingsActions } from "@web/settings/settings.store";
import {
  initialKeyboardOnlyState,
  keyboardOnlyActions,
  useKeyboardOnlyStore,
} from "@web/shortcuts/keyboard-only/keyboard-only.store";
import {
  eventJumpActions,
  initialEventJumpState,
  useEventJumpStore,
} from "@web/shortcuts/shift-hint/event-jump.store";
import { getPartsPlainText } from "@web/shortcuts/tips/shortcut-tips.data";
import {
  afterAll,
  afterEach,
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

// Do not mock.module google.sync.refresh here: process-wide mocks poison
// later/parallel suites (LifeView hung under CI). The real coordinator
// starts idle, which is what these cases need.

let isSseDegraded = false;
let isSseDegradedMocked = true;
const actualUseSseDegraded = (await import("@web/sse/hooks/useSseDegraded"))
  .useSseDegraded;
mock.module("@web/sse/hooks/useSseDegraded", () => ({
  useSseDegraded: () =>
    isSseDegradedMocked ? isSseDegraded : actualUseSseDegraded(),
}));

afterAll(() => {
  isConnectGoogleMocked = false;
  isSseDegradedMocked = false;
});

const statusBarModuleUrl = new URL(
  `./SidebarStatusBar.tsx?test=${Math.random().toString(36).slice(2)}`,
  import.meta.url,
);
const { SidebarStatusBar } = (await import(
  statusBarModuleUrl.href
)) as typeof import("./SidebarStatusBar");

const seedKeyboardPlaceDraft = () => {
  draftActions.startGridDraft({
    activity: "keyboardPlace",
    draft: createGridEventDraft(
      timedGridSchedule(
        new Date("2026-05-20T09:00:00.000"),
        new Date("2026-05-20T10:00:00.000"),
      ),
    ),
  });
};

const KEYBOARD_PLACE_HINT = getPartsPlainText(KEYBOARD_PLACE_HINT_PARTS);

describe("SidebarStatusBar", () => {
  beforeEach(() => {
    googleState = "HEALTHY";
    isConnecting = false;
    connection = null;
    isSseDegraded = false;
    draftActions.discard();
    useKeyboardOnlyStore.setState(initialKeyboardOnlyState, true);
    useEventJumpStore.setState(initialEventJumpState, true);
    useEdgeFocusStore.setState(initialEdgeFocusState, true);
  });

  afterEach(() => {
    draftActions.discard();
    useKeyboardOnlyStore.setState(initialKeyboardOnlyState, true);
    useEventJumpStore.setState(initialEventJumpState, true);
    useEdgeFocusStore.setState(initialEdgeFocusState, true);
  });

  it("shows 'Saving changes…' when a mutation is pending", () => {
    const { queryClient, wrapper } = createStoreWrapper();
    seedPendingEventMutations(queryClient, ["event-1"]);

    render(<SidebarStatusBar />, { wrapper });

    expect(screen.getByText("Saving changes…")).toBeInTheDocument();
  });

  it("reserves space for the status line when idle, showing the anonymous trial chip", async () => {
    const { wrapper } = createStoreWrapper();

    render(<SidebarStatusBar />, { wrapper });

    // No SessionContext.Provider means these tests render as anonymous, so
    // an idle bar falls back to the trial countdown chip rather than blank
    // space — there is no truly empty state for an anonymous user anymore.
    // The chip depends on the (async, MSW-stubbed) /config enforcement
    // check, so this settles a beat after the initial render.
    expect(
      await screen.findByRole("button", { name: /Trial: \d+ days? left/ }),
    ).toBeInTheDocument();
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

    expect(screen.queryByText("Adding your calendar…")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("shows Syncing in the background when catch-up is more than two minutes behind", () => {
    googleState = "IMPORTING";
    connection = createMockConnection("ahab@pequod.com", {
      state: "catchingUp",
      lastSyncedAt: new Date(Date.now() - 15 * 60_000).toISOString(),
      lastHealthyAt: new Date(Date.now() - 15 * 60_000).toISOString(),
      connectionState: "IMPORTING",
    });
    const { wrapper } = createStoreWrapper();

    render(<SidebarStatusBar />, { wrapper });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Syncing in the background…",
    );
    expect(screen.getByRole("button")).toHaveAttribute(
      "title",
      "Syncing in the background…",
    );
  });

  it("shows Calendar updates are delayed for delayed workOverdue", () => {
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

    expect(screen.getByRole("status")).toHaveTextContent(
      "Calendar updates are delayed",
    );
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
        name: "Calendar updates are delayed. Open account settings",
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

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("shows a live-updates warning when SSE is degraded and sync is otherwise silent", () => {
    googleState = "HEALTHY";
    isSseDegraded = true;
    const { wrapper } = createStoreWrapper();

    render(<SidebarStatusBar />, { wrapper });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Reconnecting live updates…",
    );
  });

  it("does not let the live-updates warning preempt a real sync problem", () => {
    googleState = "ATTENTION";
    isSseDegraded = true;
    connection = createMockConnection("ahab@pequod.com", {
      state: "delayed",
      stateReason: "workOverdue",
      connectionState: "ATTENTION",
    });
    const { wrapper } = createStoreWrapper();

    render(<SidebarStatusBar />, { wrapper });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Calendar updates are delayed",
    );
    expect(screen.queryByText("Reconnecting live updates…")).toBeNull();
  });

  it("prefers 'Saving changes…' over the live-updates warning when both are true", () => {
    isSseDegraded = true;
    const { queryClient, wrapper } = createStoreWrapper();
    seedPendingEventMutations(queryClient, ["event-1"]);

    render(<SidebarStatusBar />, { wrapper });

    expect(screen.getByRole("status")).toHaveTextContent("Saving changes…");
  });

  it("shows Enter to open and Esc to discard while a form-closed keyboardPlace draft exists", () => {
    seedKeyboardPlaceDraft();
    const { wrapper } = createStoreWrapper();

    render(<SidebarStatusBar />, { wrapper });

    expect(screen.getByRole("status")).toHaveTextContent(KEYBOARD_PLACE_HINT);
  });

  it("hides the keyboardPlace hint once the form is open", () => {
    seedKeyboardPlaceDraft();
    draftActions.setFormOpen(true);
    const { wrapper } = createStoreWrapper();

    render(<SidebarStatusBar />, { wrapper });

    expect(screen.queryByText(KEYBOARD_PLACE_HINT)).not.toBeInTheDocument();
  });

  it("yields the keyboardPlace hint to Hardcore Mode", () => {
    seedKeyboardPlaceDraft();
    keyboardOnlyActions.enter();
    const { wrapper } = createStoreWrapper();

    render(<SidebarStatusBar />, { wrapper });

    expect(screen.getByRole("status")).toHaveTextContent("Hardcore Mode · Esc");
    expect(screen.queryByText(KEYBOARD_PLACE_HINT)).not.toBeInTheDocument();
  });

  it("yields the keyboardPlace hint to event jump", () => {
    seedKeyboardPlaceDraft();
    eventJumpActions.setActive(true);
    const { wrapper } = createStoreWrapper();

    render(<SidebarStatusBar />, { wrapper });

    expect(screen.getByRole("status")).toHaveTextContent("Event jump · Esc");
    expect(screen.queryByText(KEYBOARD_PLACE_HINT)).not.toBeInTheDocument();
  });

  it("yields the keyboardPlace hint to edge focus", () => {
    seedKeyboardPlaceDraft();
    edgeFocusActions.setEdge(
      "aaaaaaaaaaaaaaaaaaaaaaaa",
      "startDate",
      "Editing start time",
    );
    const { wrapper } = createStoreWrapper();

    render(<SidebarStatusBar />, { wrapper });

    expect(screen.getByRole("status")).toHaveTextContent("Editing start time");
    expect(screen.queryByText(KEYBOARD_PLACE_HINT)).not.toBeInTheDocument();
  });
});
