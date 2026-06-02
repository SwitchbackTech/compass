import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";
import "@testing-library/jest-dom";
import { ShortcutsOverlay } from "./ShortcutsOverlay";

const sections = [
  {
    title: "Day",
    shortcuts: [
      { k: "j", label: "Previous day" },
      { k: "k", label: "Next day" },
    ],
  },
  {
    title: "Empty",
    shortcuts: [],
  },
];

describe("ShortcutsOverlay", () => {
  it("renders shortcut sections over the planner sidebar", () => {
    render(
      <ShortcutsOverlay isOpen={true} onClose={mock()} sections={sections} />,
    );

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

  it("calls onClose when closed with Escape", () => {
    const onClose = mock();

    render(
      <ShortcutsOverlay isOpen={true} onClose={onClose} sections={sections} />,
    );

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not render when closed", () => {
    render(
      <ShortcutsOverlay isOpen={false} onClose={mock()} sections={sections} />,
    );

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
