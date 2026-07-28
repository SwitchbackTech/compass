import "@testing-library/jest-dom";
import { PlusIcon } from "@phosphor-icons/react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithStore } from "@web/__tests__/render-with-store";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import { onViewCommand } from "@web/common/utils/dom/view-command-bus";
import { type EventMutationDependencies } from "@web/events/mutations/useEventMutations";
import { type EventRepository } from "@web/events/repositories/event.repository.types";
import {
  undoHistoryActions,
  useUndoHistoryStore,
} from "@web/events/stores/undo.store";
import {
  selectIsCmdPaletteOpen,
  useSettingsStore,
} from "@web/settings/settings.store";
import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";

const mockNavigate = mock();
// Bun's mock.module is process-wide, so mock the router's useNavigate directly
// rather than relying on a real RouterProvider. Snapshotted into a plain
// object because mock.module mutates the live module object in place, and
// the factory checks a flag on every call (flipped off in afterAll) so files
// running later in the same process get the real hook back - restoring the
// module in afterAll instead would race with other files' top-level imports.
const actualTanstackRouter = { ...(await import("@tanstack/react-router")) };
let isNavigateMocked = true;

mock.module("@tanstack/react-router", () => ({
  ...actualTanstackRouter,
  useNavigate: (...args: unknown[]) =>
    isNavigateMocked
      ? mockNavigate
      : // biome-ignore lint/correctness/useHookAtTopLevel: this is a mock.module factory, not a component - the flag is stable for the lifetime of any given render (it only flips once, in afterAll, after this file's components have unmounted).
        actualTanstackRouter.useNavigate(...(args as [])),
}));

afterAll(() => {
  isNavigateMocked = false;
  isUseConnectGoogleMocked = false;
});

// The other Settings-section hooks (auth/logout/subscribe/calendar-sync) hang
// off session or Google state that other suites mock globally (bun's
// mock.module leaks across files), so their items are order-dependent and we
// don't assert on them here — each has its own dedicated test. We stub only
// useConnectGoogle (not useCalendarSyncCmdItems) so the real calendar-sync
// hook runs while skipping async /config fetch. We deliberately do NOT stub
// useSubscribeCmdItems: even a restorable stub would still evaluate (and
// permanently cache) the real module the first time, binding its `UserApi`
// import ahead of useSubscribeCmdItems.test.ts's own mock and breaking that
// file's assertions instead.
const actualUseConnectGoogle = {
  ...(await import("@web/auth/google/hooks/useConnectGoogle/useConnectGoogle")),
};
const mockUseConnectGoogle = mock();
let isUseConnectGoogleMocked = true;

mock.module("@web/auth/google/hooks/useConnectGoogle/useConnectGoogle", () => ({
  useConnectGoogle: (...args: unknown[]) =>
    isUseConnectGoogleMocked
      ? mockUseConnectGoogle()
      : // biome-ignore lint/correctness/useHookAtTopLevel: mock.module factory; flag is stable until afterAll.
        actualUseConnectGoogle.useConnectGoogle(...(args as [])),
}));

// useExportDataCmdItems calls useUser(), which throws outside a
// UserProvider — this render tree doesn't have one (see renderWithStore).
// Mock useUser itself (not the hook module) so the real hook runs: it
// naturally contributes no item since email is undefined here, matching
// the "don't stub a hook with its own dedicated test file" rule above —
// stubbing the hook module directly broke useExportDataCmdItems.test.ts's
// cache-busted import of that same specifier when both ran in one process.
mock.module("@web/auth/compass/user/hooks/useUser", () => ({
  useUser: () => ({}),
}));

const { CommandPalette, LifeCommandPalette, filterSections } = await import(
  "./CommandPalette"
);

const onGoToToday = mock();
const onShowShortcuts = mock();
const mockOnConnectGoogle = mock();

const setMockGoogleConnection = (
  state:
    | "NOT_CONNECTED"
    | "ATTENTION"
    | "repairing"
    | "IMPORTING"
    | "checking"
    | "HEALTHY" = "NOT_CONNECTED",
) => {
  const commandActionByState = {
    NOT_CONNECTED: {
      label: "Connect Google Calendar",
      icon: PlusIcon,
      onSelect: mockOnConnectGoogle,
    },
    ATTENTION: {
      label: "Sync Google Calendar",
      icon: PlusIcon,
      onSelect: mockOnConnectGoogle,
    },
    repairing: null,
    IMPORTING: null,
    checking: null,
    HEALTHY: null,
  } as const;

  mockUseConnectGoogle.mockReturnValue({
    isAvailable: true,
    isConnecting: false,
    commandAction: commandActionByState[state],
    state,
  });
};

const renderPalette = (
  mutationDependencies?: EventMutationDependencies,
  currentView: "day" | "week" = "week",
) =>
  renderWithStore(
    <CommandPalette
      currentView={currentView}
      onGoToToday={onGoToToday}
      onShowShortcuts={onShowShortcuts}
      placeholder="Try: 'create', 'bug', or 'code'"
      mutationDependencies={mutationDependencies}
    />,
    { settings: { isCmdPaletteOpen: true } },
  );

const getInput = () =>
  screen.getByLabelText("Command palette search") as HTMLInputElement;

// The active row is the one the component paints with the active token; this
// is driven by our own activeIndex, which is exactly what we want to assert.
// Scoped to the label span (not the row's full textContent) so it isn't
// polluted by the row's keycap chip text (e.g. "Go to DayD").
const activeRowText = (container: HTMLElement) =>
  container.ownerDocument.querySelector(".bg-surface-overlay > span")
    ?.textContent ?? null;

const isOpen = () => selectIsCmdPaletteOpen(useSettingsStore.getState());

describe("CommandPalette", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    onGoToToday.mockClear();
    onShowShortcuts.mockClear();
    mockOnConnectGoogle.mockClear();
    setMockGoogleConnection("NOT_CONNECTED");
  });

  it("renders all sections with items and focuses the input on mount", () => {
    const { container } = renderPalette();

    expect(screen.getByText("Navigation")).toBeInTheDocument();
    expect(screen.getByText("Common Tasks")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("More")).toBeInTheDocument();

    // Navigation always lists Today first, then app views.
    expect(screen.getByText("Go to Today")).toBeInTheDocument();
    expect(screen.getByText("Go to Day")).toBeInTheDocument();
    expect(screen.queryByText("Go to Week")).not.toBeInTheDocument();
    expect(screen.getByText("Go to Life")).toBeInTheDocument();
    expect(screen.getByText("Create event")).toBeInTheDocument();
    expect(screen.getByText("Create all-day event")).toBeInTheDocument();
    // Settings surfaces the (stubbed) Google item.
    expect(screen.getByText("Connect Google Calendar")).toBeInTheDocument();
    expect(getInput()).toHaveFocus();
    // First option is active by default.
    expect(activeRowText(container)).toBe("Go to Today");
  });

  it("renders the Day and Week navigation shortcut tips", () => {
    const { unmount } = renderPalette();
    const dayRow = screen.getByText("Go to Day").closest("button");

    expect(dayRow?.querySelector("[aria-hidden='true']")?.textContent).toBe(
      "D",
    );

    unmount();
    renderPalette(undefined, "day");
    const weekRow = screen.getByText("Go to Week").closest("button");

    expect(weekRow?.querySelector("[aria-hidden='true']")?.textContent).toBe(
      "W",
    );
  });

  it("filters case-insensitively, dropping empty sections, and shows a no-results row", () => {
    renderPalette();

    fireEvent.change(getInput(), { target: { value: "create event" } });

    expect(screen.getByText("Create event")).toBeInTheDocument();
    expect(screen.queryByText("Create all-day event")).not.toBeInTheDocument();
    expect(screen.queryByText("Navigation")).not.toBeInTheDocument();
    expect(screen.queryByText("Settings")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Connect Google Calendar"),
    ).not.toBeInTheDocument();

    fireEvent.change(getInput(), { target: { value: "zzzzz" } });
    expect(screen.getByText(/No results for/)).toBeInTheDocument();
  });

  it("moves the active option with arrows, wraps, and skips disabled items", () => {
    const { container } = renderPalette();
    const input = getInput();

    // The Undo row renders as a disabled button when there's no history.
    expect(
      screen.getByText("Undo last change").closest("button"),
    ).toBeDisabled();

    // First option active by default; ArrowUp wraps to the last (Version) row.
    expect(activeRowText(container)).toBe("Go to Today");
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(activeRowText(container)).toMatch(/Version/);
    // ArrowDown from the last option wraps back to the first.
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(activeRowText(container)).toBe("Go to Today");

    // Walk down to "Create all-day event", then the next ArrowDown skips the
    // disabled Undo row and lands on the Appearance section's theme toggle.
    fireEvent.keyDown(input, { key: "ArrowDown" }); // Go to Day
    fireEvent.keyDown(input, { key: "ArrowDown" }); // Go to Life
    fireEvent.keyDown(input, { key: "ArrowDown" }); // Show Shortcuts
    fireEvent.keyDown(input, { key: "ArrowDown" }); // Create event
    fireEvent.keyDown(input, { key: "ArrowDown" }); // Create all-day event
    expect(activeRowText(container)).toBe("Create all-day event");
    fireEvent.keyDown(input, { key: "ArrowDown" }); // skips Undo last change
    expect(activeRowText(container)).toBe("Switch to light theme");
  });

  it("runs the active item's onClick and closes on Enter", async () => {
    const onCreateTimedDraft = mock();
    const unsubscribe = onViewCommand("CREATE_TIMED_DRAFT", onCreateTimedDraft);
    renderPalette();
    const input = getInput();

    // Isolate "Create event" so it becomes the sole (active) option.
    fireEvent.change(input, { target: { value: "Create event" } });
    fireEvent.keyDown(input, { key: "Enter" });

    // The click defers the emit to a microtask so the palette can unmount first.
    await waitFor(() => {
      expect(onCreateTimedDraft).toHaveBeenCalledTimes(1);
    });
    expect(isOpen()).toBe(false);
    unsubscribe();
  });

  it("resets the active option to the first after typing", () => {
    const { container } = renderPalette();
    const input = getInput();

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(activeRowText(container)).toBe("Go to Day");

    fireEvent.change(input, { target: { value: "go" } });
    expect(activeRowText(container)).toBe("Go to Today");
  });

  it("closes on Escape", () => {
    renderPalette();
    fireEvent.keyDown(getInput(), { key: "Escape" });
    expect(isOpen()).toBe(false);
  });

  it("closes on outside press", () => {
    renderPalette();
    const overlay = document.querySelector(".backdrop-blur-sm") as HTMLElement;
    fireEvent.pointerDown(overlay);
    fireEvent.click(overlay);
    expect(isOpen()).toBe(false);
  });

  it("renders a disabled Undo row with keycaps when there is no history", () => {
    renderPalette();

    const row = screen.getByText("Undo last change").closest("button");
    expect(row).toBeDisabled();
    // Two keycap chips: the platform modifier and Z (see the aria-hidden
    // note in the Show Shortcuts test below).
    expect(row?.querySelectorAll("[aria-hidden='true']")).toHaveLength(2);
  });

  it("undoes the last change and closes when the Undo row is clicked", async () => {
    const before = createMockEvent({
      content: { kind: "details", title: "Before", description: "" },
    });
    undoHistoryActions.record({
      kind: "edit",
      id: before.id,
      before,
      after: {
        ...before,
        content: { kind: "details", title: "After", description: "" },
      },
    });
    const repository: EventRepository = {
      list: async () => [],
      getById: async () => before,
      create: async () => before,
      replace: async (id, input) => ({
        ...before,
        id,
        content: input.content,
        schedule: input.schedule,
      }),
      delete: async () => {},
    };
    renderPalette({
      source: "local",
      repository,
      markWrite: async () => {},
      reportError: () => {},
    });

    const row = screen.getByText("Undo last change").closest("button");
    expect(row).not.toBeDisabled();

    fireEvent.click(row as HTMLButtonElement);

    // The click defers undo to a microtask so the palette can unmount first.
    await waitFor(() => {
      expect(useUndoHistoryStore.getState().past).toHaveLength(0);
      expect(useUndoHistoryStore.getState().future).toHaveLength(1);
    });
    expect(isOpen()).toBe(false);
  });

  it("renders a keycap chip for the shortcut and runs onShowShortcuts on click", () => {
    renderPalette();

    // `[aria-hidden='true']` (not `.c-keycap`) because SelectView.test.tsx
    // mocks ShortcutHint process-wide (bun's mock.module leaks across
    // files); its stub keeps aria-hidden but drops the real class.
    const row = screen.getByText("Show keyboard shortcuts").closest("button");
    expect(row?.querySelector("[aria-hidden='true']")?.textContent).toBe("?");

    fireEvent.click(row as HTMLButtonElement);
    expect(onShowShortcuts).toHaveBeenCalledTimes(1);
    expect(isOpen()).toBe(false);
  });

  it("renders no sync status line when there is no sync status", () => {
    renderPalette();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders the sync status line above the input with the variant color", () => {
    setMockGoogleConnection("ATTENTION");
    renderPalette();

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Calendar is out of date");
    expect(status).toHaveClass("text-warning");
    expect(status).not.toHaveAttribute("role", "option");

    // Survives an unrelated search that empties the list.
    fireEvent.change(getInput(), { target: { value: "zzzzz" } });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Calendar is out of date",
    );
  });

  it("shows the shimmer class for a syncing status", () => {
    setMockGoogleConnection("repairing");
    renderPalette();

    expect(screen.getByRole("status")).toHaveClass("c-sync-text-wave");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Syncing your calendar…",
    );
  });

  it("keeps the palette open when syncing Google Calendar", () => {
    setMockGoogleConnection("ATTENTION");
    renderPalette();

    fireEvent.click(screen.getByText("Sync Google Calendar"));

    expect(mockOnConnectGoogle).toHaveBeenCalledTimes(1);
    expect(isOpen()).toBe(true);
  });
});

describe("LifeCommandPalette", () => {
  beforeEach(() => {
    mockOnConnectGoogle.mockClear();
    setMockGoogleConnection("HEALTHY");
  });

  it("renders the sync status line above the input", () => {
    renderWithStore(
      <LifeCommandPalette placeholder="Try: 'day', 'week', or 'feedback'" />,
      { settings: { isCmdPaletteOpen: true } },
    );

    expect(screen.getByRole("status")).toHaveTextContent("Calendar up-to-date");
  });
});

describe("filterSections", () => {
  const sections = [
    {
      id: "a",
      heading: "A",
      items: [
        { id: "1", label: "Create Event", icon: PlusIcon },
        { id: "2", label: "Report Bug", icon: PlusIcon },
      ],
    },
    {
      id: "b",
      heading: "B",
      items: [{ id: "3", label: "Share Feedback", icon: PlusIcon }],
    },
  ];

  it("returns all sections when the query is empty or whitespace", () => {
    expect(filterSections(sections, "")).toEqual(sections);
    expect(filterSections(sections, "   ")).toEqual(sections);
  });

  it("matches labels case-insensitively as a substring", () => {
    const result = filterSections(sections, "REPORT");
    expect(result).toHaveLength(1);
    expect(result[0].items).toHaveLength(1);
    expect(result[0].items[0].label).toBe("Report Bug");
  });

  it("drops sections whose items all filter out", () => {
    const result = filterSections(sections, "share");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("b");
  });

  it("trims the query before matching", () => {
    const result = filterSections(sections, "  event  ");
    expect(result).toHaveLength(1);
    expect(result[0].items[0].label).toBe("Create Event");
  });
});
