import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { afterAll } from "bun:test";

const useDroppable = mock();

mock.module("@dnd-kit/core", () => ({
  useDroppable,
  useDndContext: mock(),
  useDraggable: mock(),
  DndContext: mock(),
  DragOverlay: mock(),
  KeyboardSensor: "KeyboardSensor",
  MouseSensor: "MouseSensor",
  TouchSensor: "TouchSensor",
  useSensor: mock(),
  useSensors: mock(),
}));

const { Droppable } =
  require("@web/components/DND/Droppable") as typeof import("@web/components/DND/Droppable");

describe("Droppable", () => {
  const mockDndProps = {
    id: "test-droppable",
    data: { containerWidth: 100 },
  };

  beforeEach(() => {
    useDroppable.mockClear();
    useDroppable.mockReturnValue({
      setNodeRef: mock(),
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
});

afterAll(() => {
  mock.restore();
});
