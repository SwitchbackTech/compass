import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { ShortcutsOverlay } from "./ShortcutsOverlay";

const baseSections = [
  {
    title: "Now",
    shortcuts: [
      { k: "j", label: "Previous task" },
      { k: "k", label: "Next task" },
    ],
  },
  {
    title: "Global",
    shortcuts: [
      { k: "1", label: "Now" },
      { k: "2", label: "Day" },
    ],
  },
];

describe("ShortcutsOverlay", () => {
  it("renders shortcut sections for provided data", () => {
    render(<ShortcutsOverlay sections={baseSections} />);

    // jest cannot actively determine applied pseudo-classes
    // a browser environment should be used for this test
    // move to playwright
    const overlay = screen.getByRole("complementary", { hidden: true });
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveAttribute("aria-label", "Shortcut overlay");
    expect(screen.getByText("Shortcuts")).toBeInTheDocument();
    expect(screen.getAllByText("Now").length).toBeGreaterThan(0);
    expect(screen.getByText("Global")).toBeInTheDocument();
    expect(screen.getByText("Day")).toBeInTheDocument();
  });

  it("does not render empty sections", () => {
    render(
      <ShortcutsOverlay
        sections={[{ title: "Empty", shortcuts: [] }, ...baseSections]}
      />,
    );

    expect(screen.queryByText("Empty")).not.toBeInTheDocument();
    expect(screen.getAllByText("Now").length).toBeGreaterThan(0);
  });

  it("supports custom heading, aria-label, and className", () => {
    render(
      <ShortcutsOverlay
        sections={baseSections}
        heading="Commands"
        ariaLabel="Command overlay"
        className="test-class"
      />,
    );

    const overlay = screen.getByRole("complementary", {
      hidden: true,
    });
    expect(overlay).toHaveAttribute("aria-label", "Command overlay");
    expect(overlay).toHaveTextContent("Commands");
    expect(overlay).toHaveClass("test-class");
  });

  it("returns null when no sections have shortcuts", () => {
    const { container } = render(
      <ShortcutsOverlay sections={[{ title: "Empty", shortcuts: [] }]} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
