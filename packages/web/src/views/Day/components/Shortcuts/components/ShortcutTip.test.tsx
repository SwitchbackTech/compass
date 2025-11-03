import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShortcutTip } from "./ShortcutTip";

describe("ShortcutTip", () => {
  it("renders a single string shortcut", () => {
    render(<ShortcutTip shortcut="C" aria-label="Press C to create task" />);
    const shortcutElement = screen.getByLabelText("Press C to create task");
    expect(shortcutElement).toHaveTextContent("C");
  });

  it("renders an array of strings as a joined shortcut with +", () => {
    render(<ShortcutTip shortcut={["Cmd", "K"]} aria-label="Press Cmd+K" />);
    const shortcutElement = screen.getByLabelText("Press Cmd+K");
    expect(shortcutElement).toHaveTextContent("Cmd + K");
  });

  it("renders multiple shortcuts from array correctly", () => {
    render(
      <ShortcutTip
        shortcut={["Ctrl", "Alt", "Delete"]}
        aria-label="Press Ctrl+Alt+Delete"
      />,
    );
    const shortcutElement = screen.getByLabelText("Press Ctrl+Alt+Delete");
    expect(shortcutElement).toHaveTextContent("Ctrl + Alt + Delete");
  });

  it("applies correct Tailwind styling", () => {
    render(<ShortcutTip shortcut="C" />);
    const shortcutElement = screen.getByText("C");
    expect(shortcutElement).toHaveClass("rounded", "bg-gray-400");
    expect(shortcutElement).toHaveClass("px-1.5", "py-0.5");
    expect(shortcutElement).toHaveClass("text-xs", "text-gray-300");
  });

  it("works without aria-label", () => {
    render(<ShortcutTip shortcut="C" />);
    const shortcutElement = screen.getByText("C");
    expect(shortcutElement).toBeInTheDocument();
  });

  it("wraps child components and shows shortcut on hover", async () => {
    const user = userEvent.setup();
    render(
      <ShortcutTip shortcut="C">
        <button>Some Button</button>
      </ShortcutTip>,
    );

    const button = screen.getByText("Some Button");
    expect(button).toBeInTheDocument();

    // Shortcut should not be visible initially
    expect(screen.queryByText("C")).not.toBeInTheDocument();

    // Hover over button to show shortcut
    await user.hover(button);
    await waitFor(() => {
      expect(screen.getByText("C")).toBeInTheDocument();
    });
  });

  it("renders wrapped component with array shortcut on hover", async () => {
    const user = userEvent.setup();
    render(
      <ShortcutTip shortcut={["Cmd", "K"]}>
        <button>Quick Action</button>
      </ShortcutTip>,
    );

    const button = screen.getByText("Quick Action");
    expect(button).toBeInTheDocument();

    // Shortcut should not be visible initially
    expect(screen.queryByText("Cmd + K")).not.toBeInTheDocument();

    // Hover over button to show shortcut
    await user.hover(button);
    await waitFor(() => {
      expect(screen.getByText("Cmd + K")).toBeInTheDocument();
    });
  });

  it("hides shortcut when mouse leaves", async () => {
    const user = userEvent.setup();
    render(
      <ShortcutTip shortcut="C">
        <button>Test Button</button>
      </ShortcutTip>,
    );

    const button = screen.getByText("Test Button");

    // Hover to show shortcut
    await user.hover(button);
    await waitFor(() => {
      expect(screen.getByText("C")).toBeInTheDocument();
    });

    // Move mouse away to hide shortcut
    await user.unhover(button);
    await waitFor(() => {
      expect(screen.queryByText("C")).not.toBeInTheDocument();
    });
  });
});
