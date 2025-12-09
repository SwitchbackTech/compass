import { useDroppable } from "@dnd-kit/core";
import { render, screen } from "@testing-library/react";
import { Droppable } from "@web/components/DND/Droppable";

jest.mock("@dnd-kit/core", () => ({
  useDroppable: jest.fn(),
}));

describe("Droppable", () => {
  const mockDndProps = {
    id: "test-droppable",
    data: { containerWidth: 100 },
  };

  beforeEach(() => {
    (useDroppable as jest.Mock).mockReturnValue({
      setNodeRef: jest.fn(),
      active: null,
      isOver: false,
      node: { current: null },
      over: null,
      rect: null,
    });
  });

  it("renders children correctly", () => {
    render(
      <Droppable dndProps={mockDndProps} as="div">
        <div>Child Content</div>
      </Droppable>,
    );

    expect(screen.getByText("Child Content")).toBeInTheDocument();
  });

  it("applies overflow style when active item exists", () => {
    (useDroppable as jest.Mock).mockReturnValue({
      setNodeRef: jest.fn(),
      active: { id: "active-item" },
      isOver: false,
      node: { current: null },
      over: null,
      rect: null,
    });

    render(
      <Droppable dndProps={mockDndProps} as="div" data-testid="droppable">
        <div>Child Content</div>
      </Droppable>,
    );

    const element = screen.getByTestId("droppable");
    expect(element).toHaveStyle("overflow-y: hidden");
  });

  it("does not apply overflow style when no active item", () => {
    (useDroppable as jest.Mock).mockReturnValue({
      setNodeRef: jest.fn(),
      active: null,
      isOver: false,
      node: { current: null },
      over: null,
      rect: null,
    });

    render(
      <Droppable dndProps={mockDndProps} as="div" data-testid="droppable">
        <div>Child Content</div>
      </Droppable>,
    );

    const element = screen.getByTestId("droppable");
    expect(element).not.toHaveStyle("overflow-y: hidden");
  });
});
