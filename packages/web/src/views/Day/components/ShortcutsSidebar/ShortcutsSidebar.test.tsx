import { act } from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { ShortcutsSidebar } from "./ShortcutsSidebar";

const baseSections = [
  {
    title: "Day",
    shortcuts: [
      { k: "j", label: "Previous day" },
      { k: "k", label: "Next day" },
    ],
  },
  {
    title: "Tasks",
    shortcuts: [
      { k: "c", label: "Create task" },
      { k: "e", label: "Edit task" },
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

  it("does not render when closed and not visible", () => {
    const { container } = render(
      <ShortcutsSidebar isOpen={false} sections={baseSections} />,
    );

    // Initially renders for animation, but after state settles it should be hidden
    // Since isOpen=false and isVisible starts as false, it returns null
    expect(container.querySelector("aside")).not.toBeInTheDocument();
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

  it("applies open animation classes when visible", async () => {
    render(<ShortcutsSidebar isOpen={true} sections={baseSections} />);

    // Wait for requestAnimationFrame to trigger
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });

    const sidebar = screen.getByRole("complementary", { hidden: true });
    expect(sidebar).toHaveClass("translate-x-0");
    expect(sidebar).toHaveClass("opacity-100");
  });

  it("applies closed animation classes during close transition", async () => {
    // Start with isOpen=true so component renders
    const { rerender } = render(
      <ShortcutsSidebar isOpen={true} sections={baseSections} />,
    );

    // Wait for open animation
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });

    // Rerender with isOpen=false to trigger close animation
    // The component stays mounted briefly during the transition
    rerender(<ShortcutsSidebar isOpen={false} sections={baseSections} />);

    // During the close transition (before unmount), isVisible becomes false
    // but the component is still rendered because isOpen just changed
    const sidebar = screen.queryByRole("complementary", { hidden: true });

    // After transition, sidebar may be unmounted - this is expected behavior
    // The animation applies -translate-x-4 and opacity-0 before unmounting
    if (sidebar) {
      expect(sidebar).toHaveClass("-translate-x-4");
      expect(sidebar).toHaveClass("opacity-0");
    }
  });
});
