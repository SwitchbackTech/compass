import { render, screen } from "@testing-library/react";
import { Categories_Event } from "@core/types/event.types";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const useDraggable = mock();

mock.module("@dnd-kit/core", () => ({
  useDraggable,
  useDndContext: mock(),
  useDroppable: mock(),
  DndContext: mock(),
  DragOverlay: mock(),
  KeyboardSensor: "KeyboardSensor",
  MouseSensor: "MouseSensor",
  TouchSensor: "TouchSensor",
  useSensor: mock(),
  useSensors: mock(),
}));

const { Draggable } =
  require("@web/components/DND/Draggable") as typeof import("@web/components/DND/Draggable");

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
    useDraggable.mockClear();
    useDraggable.mockReturnValue({
      attributes: {},
      listeners: {},
      setNodeRef: mock(),
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
    useDraggable.mockReturnValue({
      attributes: { "aria-roledescription": "draggable" },
      listeners: { onKeyDown: mock() },
      setNodeRef: mock(),
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
    useDraggable.mockReturnValue({
      attributes: {},
      listeners: {},
      setNodeRef: mock(),
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

  it("updates disabled prop correctly when it changes", () => {
    useDraggable.mockClear();

    // Initial render with disabled: true (simulating pending event)
    const { rerender } = render(
      <Draggable
        dndProps={{ ...mockDndProps, disabled: true }}
        as="div"
        data-testid="draggable"
      >
        <div>Child Content</div>
      </Draggable>,
    );

    // Verify useDraggable was called with disabled: true
    expect(useDraggable).toHaveBeenCalledWith(
      expect.objectContaining({
        disabled: true,
      }),
    );

    // Rerender with disabled: false (simulating event no longer pending)
    rerender(
      <Draggable
        dndProps={{ ...mockDndProps, disabled: false }}
        as="div"
        data-testid="draggable"
      >
        <div>Child Content</div>
      </Draggable>,
    );

    // Verify useDraggable was called again with disabled: false
    expect(useDraggable).toHaveBeenCalledWith(
      expect.objectContaining({
        disabled: false,
      }),
    );

    // Verify it was called multiple times (initial + rerender)
    expect(useDraggable.mock.calls.length).toBeGreaterThan(1);
  });
});
