import "@testing-library/jest-dom";
import { PlusIcon } from "@phosphor-icons/react";
import { fireEvent, screen } from "@testing-library/react";
import dayjs from "@core/util/date/dayjs";
import { renderWithStore } from "@web/__tests__/render-with-store";
import {
  selectIsCmdPaletteOpen,
  useSettingsStore,
} from "@web/settings/settings.store";
import { type CommandItem } from "./command-palette.types";
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
});

// The other Settings-section hooks (auth/logout/subscribe) hang off session
// state that other suites mock globally (bun's mock.module leaks across files),
// so their items are order-dependent and we don't assert on them here — each
// has its own dedicated test. We stub only useGoogleCmdItems (no other importer,
// no dedicated test) to give the Settings section one deterministic item and to
// skip its real async /config fetch.
mock.module("@web/common/hooks/useGoogleCmdItems", () => ({
  useGoogleCmdItems: () => [
    {
      id: "connect-google-calendar",
      label: "Connect Google Calendar",
      icon: PlusIcon,
    },
  ],
}));

const { CommandPalette, filterSections } = await import("./CommandPalette");

const onGoToToday = mock();
const taskAlphaClick = mock();
const taskDisabledClick = mock();

const buildTasks = (): CommandItem[] => [
  {
    id: "task-alpha",
    label: "Task Alpha",
    icon: PlusIcon,
    onClick: taskAlphaClick,
  },
  {
    id: "task-disabled",
    label: "Task Disabled",
    icon: PlusIcon,
    disabled: true,
    onClick: taskDisabledClick,
  },
  { id: "task-gamma", label: "Task Gamma", icon: PlusIcon },
];

const renderPalette = () =>
  renderWithStore(
    <CommandPalette
      currentView="week"
      today={dayjs("2026-07-07")}
      onGoToToday={onGoToToday}
      commonTasks={buildTasks()}
      placeholder="Try: 'create', 'bug', or 'code'"
    />,
    { settings: { isCmdPaletteOpen: true } },
  );

const getInput = () =>
  screen.getByLabelText("Command palette search") as HTMLInputElement;

// The active row is the one the component paints with the active token; this
// is driven by our own activeIndex, which is exactly what we want to assert.
const activeRowText = (container: HTMLElement) =>
  container.ownerDocument.querySelector(".bg-panel-badge-bg")?.textContent ??
  null;

const isOpen = () => selectIsCmdPaletteOpen(useSettingsStore.getState());

describe("CommandPalette", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    onGoToToday.mockClear();
    taskAlphaClick.mockClear();
    taskDisabledClick.mockClear();
  });

  it("renders all sections with items and focuses the input on mount", () => {
    const { container } = renderPalette();

    expect(screen.getByText("Navigation")).toBeInTheDocument();
    expect(screen.getByText("Common Tasks")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("More")).toBeInTheDocument();

    // Week view hides its own nav item and surfaces the Day + Today entries.
    expect(screen.getByText("Go to Day [d]")).toBeInTheDocument();
    expect(screen.getByText(/Go to Today/)).toBeInTheDocument();
    expect(screen.getByText("Task Alpha")).toBeInTheDocument();
    // Settings surfaces the (stubbed) Google item.
    expect(screen.getByText("Connect Google Calendar")).toBeInTheDocument();
    expect(screen.getByText("Report Bug")).toBeInTheDocument();

    expect(getInput()).toHaveFocus();
    // First option is active by default.
    expect(activeRowText(container)).toBe("Go to Day [d]");
  });

  it("filters case-insensitively, dropping empty sections, and shows a no-results row", () => {
    renderPalette();

    fireEvent.change(getInput(), { target: { value: "task alpha" } });

    expect(screen.getByText("Task Alpha")).toBeInTheDocument();
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

    // Disabled rows render as disabled buttons.
    expect(screen.getByText("Task Disabled").closest("button")).toBeDisabled();

    // First option active by default; ArrowUp wraps to the last (Version) row.
    expect(activeRowText(container)).toBe("Go to Day [d]");
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(activeRowText(container)).toMatch(/Version/);
    // ArrowDown from the last option wraps back to the first.
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(activeRowText(container)).toBe("Go to Day [d]");

    // Walk down to Task Alpha, then the next ArrowDown skips the disabled row.
    fireEvent.keyDown(input, { key: "ArrowDown" }); // Go to Today
    fireEvent.keyDown(input, { key: "ArrowDown" }); // Task Alpha
    expect(activeRowText(container)).toBe("Task Alpha");
    fireEvent.keyDown(input, { key: "ArrowDown" }); // skips Task Disabled
    expect(activeRowText(container)).toBe("Task Gamma");
  });

  it("runs the active item's onClick and closes on Enter", () => {
    renderPalette();
    const input = getInput();

    // Isolate the spy task so it becomes the sole (active) option.
    fireEvent.change(input, { target: { value: "Task Alpha" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(taskAlphaClick).toHaveBeenCalledTimes(1);
    expect(isOpen()).toBe(false);
  });

  it("resets the active option to the first after typing", () => {
    const { container } = renderPalette();
    const input = getInput();

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(activeRowText(container)).toMatch(/Go to Today/);

    fireEvent.change(input, { target: { value: "go" } });
    expect(activeRowText(container)).toBe("Go to Day [d]");
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

  it("renders link items as anchors with href and target", () => {
    renderPalette();
    const link = screen.getByText("Report Bug").closest("a");
    expect(link).toHaveAttribute(
      "href",
      expect.stringContaining("github.com/SwitchbackTech/compass/issues"),
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
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
