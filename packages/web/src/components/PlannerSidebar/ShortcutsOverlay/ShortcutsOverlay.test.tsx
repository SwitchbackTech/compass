import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { ShortcutsOverlay } from "./ShortcutsOverlay";
import { describe, expect, it, mock } from "bun:test";

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

    expect(
      screen.getByRole("dialog", { name: "Keyboard shortcuts" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Shortcuts")).toBeInTheDocument();
    expect(screen.getByText("Day")).toBeInTheDocument();
    expect(screen.getByText("Previous day")).toBeInTheDocument();
    expect(screen.queryByText("Empty")).not.toBeInTheDocument();
  });

  it("returns focus to the planner sidebar when closed with Escape", () => {
    const onClose = mock();

    render(
      <ShortcutsOverlay isOpen={true} onClose={onClose} sections={sections} />,
    );

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not render when closed", () => {
    const { container } = render(
      <ShortcutsOverlay isOpen={false} onClose={mock()} sections={sections} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
