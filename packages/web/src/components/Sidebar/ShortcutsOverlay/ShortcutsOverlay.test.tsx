import { fireEvent, render, screen } from "@testing-library/react";
import {
  selectIsShortcutsOpen,
  useViewStore,
  viewActions,
} from "@web/events/stores/view.store";
import { describe, expect, it } from "bun:test";
import "@testing-library/jest-dom";
import { ShortcutsOverlay } from "./ShortcutsOverlay";

const sections = [
  {
    title: "Day",
    shortcuts: [
      {
        id: "nav-prev",
        keys: ["j"],
        label: "Previous day",
        section: "navigate",
      },
      { id: "nav-next", keys: ["k"], label: "Next day", section: "navigate" },
    ],
  },
  {
    title: "Empty",
    shortcuts: [],
  },
];

describe("ShortcutsOverlay", () => {
  it("renders shortcut sections over the sidebar", () => {
    viewActions.setSidebarOpen(true);
    viewActions.toggleShortcuts();

    render(<ShortcutsOverlay sections={sections} viewLabel="Day" />);

    const overlay = screen.getByRole("dialog", { name: "Keyboard shortcuts" });

    expect(overlay.firstElementChild?.className).toContain("translate-x-0");
    expect(screen.getByText("Shortcuts")).toBeInTheDocument();
    expect(
      screen.getByText("Keyboard shortcuts for Day view"),
    ).toBeInTheDocument();
    expect(screen.getByText("Day")).toBeInTheDocument();
    expect(screen.getByText("Previous day")).toBeInTheDocument();
    expect(screen.queryByText("Empty")).not.toBeInTheDocument();
  });

  it("closes when closed with Escape", () => {
    viewActions.setSidebarOpen(true);
    viewActions.toggleShortcuts();

    render(<ShortcutsOverlay sections={sections} />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(selectIsShortcutsOpen(useViewStore.getState())).toBe(false);
  });

  it("does not render when closed", () => {
    render(<ShortcutsOverlay sections={sections} />);

    expect(
      screen.queryByRole("dialog", { name: "Keyboard shortcuts" }),
    ).toBeNull();
    const overlay = screen.getByLabelText("Keyboard shortcuts", {
      selector: "div",
    });
    expect(overlay.className).toContain("pointer-events-none");
    expect(overlay.firstElementChild?.className).toContain("-translate-x-full");
    expect(
      screen.getByRole("button", { hidden: true, name: "Close shortcuts" }),
    ).toHaveProperty("tabIndex", -1);
  });
});
