import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { ShortcutsSidebar } from "./ShortcutsSidebar";

const baseSections = [
  {
    title: "Day",
    shortcuts: [
      { keys: ["j"], label: "Previous day" },
      { keys: ["k"], label: "Next day" },
    ],
  },
  {
    title: "Tasks",
    shortcuts: [
      { keys: ["c"], label: "Create task" },
      { keys: ["e"], label: "Edit task" },
    ],
  },
];

describe("ShortcutsSidebar", () => {
  it("renders shortcut sections when open", () => {
    render(<ShortcutsSidebar isOpen={true} sections={baseSections} />);

    const sidebar = screen.getByRole("complementary", { hidden: true });
    expect(sidebar).toBeInTheDocument();
    expect(sidebar).toHaveAttribute("aria-label", "Shortcuts sidebar");
    expect(screen.getByText("Shortcuts")).toBeInTheDocument();
    expect(screen.getByText("Day")).toBeInTheDocument();
    expect(screen.getByText("Tasks")).toBeInTheDocument();
  });

  it("hides shortcut sections when closed", () => {
    render(<ShortcutsSidebar isOpen={false} sections={baseSections} />);

    const sidebar = screen.getByRole("complementary", { hidden: true });

    expect(sidebar).toHaveAttribute("aria-hidden", "true");
    expect(sidebar).toHaveClass("pointer-events-none");
    expect(sidebar).toHaveClass("-translate-x-4");
    expect(sidebar).toHaveClass("opacity-0");
  });

  it("does not render empty sections", () => {
    render(
      <ShortcutsSidebar
        isOpen={true}
        sections={[{ title: "Empty", shortcuts: [] }, ...baseSections]}
      />,
    );

    expect(screen.queryByText("Empty")).not.toBeInTheDocument();
    expect(screen.getByText("Day")).toBeInTheDocument();
  });

  it("returns null when no sections have shortcuts", () => {
    const { container } = render(
      <ShortcutsSidebar
        isOpen={true}
        sections={[{ title: "Empty", shortcuts: [] }]}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("applies open animation classes when visible", () => {
    render(<ShortcutsSidebar isOpen={true} sections={baseSections} />);

    const sidebar = screen.getByRole("complementary", { hidden: true });
    expect(sidebar).toHaveAttribute("aria-hidden", "false");
    expect(sidebar).toHaveClass("translate-x-0");
    expect(sidebar).toHaveClass("opacity-100");
  });

  it("applies closed animation classes when closed", () => {
    const { rerender } = render(
      <ShortcutsSidebar isOpen={true} sections={baseSections} />,
    );

    rerender(<ShortcutsSidebar isOpen={false} sections={baseSections} />);

    const sidebar = screen.getByRole("complementary", { hidden: true });
    expect(sidebar).toHaveClass("pointer-events-none");
    expect(sidebar).toHaveClass("-translate-x-4");
    expect(sidebar).toHaveClass("opacity-0");
  });
});
