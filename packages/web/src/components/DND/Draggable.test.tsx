import { useDraggable } from "@dnd-kit/core";
import { render, screen } from "@testing-library/react";
import { Categories_Event } from "@core/types/event.types";
import { Draggable } from "@web/components/DND/Draggable";

jest.mock("@dnd-kit/core", () => ({
  useDraggable: jest.fn(),
}));

describe("Draggable", () => {
  const mockDndProps = {
    id: "test-id",
    data: {
      type: Categories_Event.TIMED,
      event: null,
      view: "day" as const,
    },
  };

  beforeEach(() => {
    (useDraggable as jest.Mock).mockReturnValue({
      attributes: {},
      listeners: {},
      setNodeRef: jest.fn(),
      transform: null,
      isDragging: false,
    });
  });

  it("renders children correctly", () => {
    render(
      <Draggable dndProps={mockDndProps} as="div">
        <div>Child Content</div>
      </Draggable>,
    );

    expect(screen.getByText("Child Content")).toBeInTheDocument();
  });

  it("applies dnd attributes and listeners", () => {
    (useDraggable as jest.Mock).mockReturnValue({
      attributes: { "aria-roledescription": "draggable" },
      listeners: { onKeyDown: jest.fn() },
      setNodeRef: jest.fn(),
      transform: null,
      isDragging: false,
    });

    render(
      <Draggable dndProps={mockDndProps} as="div" data-testid="draggable">
        <div>Child Content</div>
      </Draggable>,
    );

    const element = screen.getByTestId("draggable");
    expect(element).toHaveAttribute("aria-roledescription", "draggable");
  });

  it("applies transform style when dragging", () => {
    (useDraggable as jest.Mock).mockReturnValue({
      attributes: {},
      listeners: {},
      setNodeRef: jest.fn(),
      transform: { x: 10, y: 20, scaleX: 1, scaleY: 1 },
      isDragging: true,
    });

    render(
      <Draggable dndProps={mockDndProps} as="div" data-testid="draggable">
        <div>Child Content</div>
      </Draggable>,
    );

    const element = screen.getByTestId("draggable");
    expect(element).toHaveStyle("transform: translate3d(10px, 20px, 0)");
  });
});
