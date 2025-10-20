import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { ShortcutsOverlay } from "./ShortcutsOverlay";

describe("ShortcutsOverlay", () => {
  it("renders the shortcuts overlay", () => {
    render(<ShortcutsOverlay />);

    expect(
      screen.getByRole("complementary", { name: "Shortcut overlay" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Shortcuts")).toBeInTheDocument();
  });

  it("renders global shortcuts", () => {
    render(<ShortcutsOverlay />);

    expect(screen.getByText("Global")).toBeInTheDocument();
    expect(screen.getByText("Now")).toBeInTheDocument();
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("Week")).toBeInTheDocument();
  });

  it("renders today-specific shortcuts when isToday is true", () => {
    render(<ShortcutsOverlay />);

    expect(screen.getByText("Tasks")).toBeInTheDocument();
    expect(screen.getByText("Focus on tasks")).toBeInTheDocument();
    expect(screen.getByText("Create task")).toBeInTheDocument();
    expect(screen.getByText("Edit task")).toBeInTheDocument();
    expect(screen.getByText("Delete task")).toBeInTheDocument();

    expect(screen.getByText("Calendar")).toBeInTheDocument();
    expect(screen.getByText("Focus on calendar")).toBeInTheDocument();
    expect(screen.getByText("Edit event title")).toBeInTheDocument();
    expect(screen.getByText("Delete event")).toBeInTheDocument();
    expect(screen.getByText("Move up 15m")).toBeInTheDocument();
    expect(screen.getByText("Move down 15m")).toBeInTheDocument();
  });

  it("renders shortcut keys correctly", () => {
    render(<ShortcutsOverlay />);

    // Check that shortcut keys are rendered
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("u")).toBeInTheDocument();
    expect(screen.getByText("c")).toBeInTheDocument();

    // Check for multiple "e" keys (one in Tasks, one in Calendar)
    const eKeys = screen.getAllByText("e");
    expect(eKeys).toHaveLength(2);
  });
});
