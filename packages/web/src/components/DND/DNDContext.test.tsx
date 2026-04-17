import { render, screen } from "@testing-library/react";
import { type ReactNode } from "react";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { afterAll } from "bun:test";

const DndContext = mock(({ children }: { children: ReactNode }) => (
  <div data-testid="dnd-context">{children}</div>
));
const usePointerPosition = mock();
const useSensor = mock();
const useSensors = mock();
const isDraggingEvent$ = {
  next: mock(),
};

mock.module("@web/common/hooks/usePointerPosition", () => ({
  usePointerPosition,
}));

mock.module("@web/common/hooks/useIsDraggingEvent", () => ({
  isDraggingEvent$,
}));

mock.module("@dnd-kit/core", () => ({
  DndContext,
  DragOverlay: ({ children }: { children: ReactNode }) => children,
  KeyboardSensor: "KeyboardSensor",
  MouseSensor: "MouseSensor",
  TouchSensor: "TouchSensor",
  useDndContext: mock(),
  useDraggable: mock(),
  useDroppable: mock(),
  useSensor,
  useSensors,
}));

const { DNDContext } =
  require("@web/components/DND/DNDContext") as typeof import("@web/components/DND/DNDContext");

describe("DNDContext", () => {
  const mockTogglePointerMovementTracking = mock();

  beforeEach(() => {
    usePointerPosition.mockReturnValue({
      togglePointerMovementTracking: mockTogglePointerMovementTracking,
    });
    mockTogglePointerMovementTracking.mockClear();
    isDraggingEvent$.next.mockClear();
    useSensor.mockClear();
    useSensors.mockClear();
    DndContext.mockClear();
  });

  it("renders children wrapped in DndContext", () => {
    render(
      <DNDContext>
        <div data-testid="child">Child</div>
      </DNDContext>,
    );

    expect(screen.getByTestId("dnd-context")).toBeInTheDocument();
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("calls togglePointerMovementTracking(true) and isDraggingEvent$.next(true) on activation", () => {
    render(
      <DNDContext>
        <div>Child</div>
      </DNDContext>,
    );

    // Find the call to useSensor that has onActivation
    // useSensor is called multiple times. We need to find one with onActivation in options.
    const activationCall = useSensor.mock.calls.find(
      (call) => call[1]?.onActivation,
    );

    expect(activationCall).toBeDefined();
    if (!activationCall?.[1]?.onActivation) {
      throw new Error("Expected useSensor to receive onActivation");
    }

    activationCall[1].onActivation();

    expect(mockTogglePointerMovementTracking).toHaveBeenCalledWith(true);
    expect(isDraggingEvent$.next).toHaveBeenCalledWith(true);
  });

  it("calls togglePointerMovementTracking(false) and isDraggingEvent$.next(false) on deactivation via onDragEnd", () => {
    render(
      <DNDContext>
        <div>Child</div>
      </DNDContext>,
    );

    const dndContextProps = DndContext.mock.calls[0]?.[0];
    dndContextProps.onDragEnd();

    expect(mockTogglePointerMovementTracking).toHaveBeenCalledWith(false);
    expect(isDraggingEvent$.next).toHaveBeenCalledWith(false);
  });

  it("calls togglePointerMovementTracking(false) and isDraggingEvent$.next(false) on deactivation via onDragCancel", () => {
    render(
      <DNDContext>
        <div>Child</div>
      </DNDContext>,
    );

    const dndContextProps = DndContext.mock.calls[0]?.[0];
    dndContextProps.onDragCancel();

    expect(mockTogglePointerMovementTracking).toHaveBeenCalledWith(false);
    expect(isDraggingEvent$.next).toHaveBeenCalledWith(false);
  });

  it("calls togglePointerMovementTracking(false) and isDraggingEvent$.next(false) on deactivation via onDragAbort", () => {
    render(
      <DNDContext>
        <div>Child</div>
      </DNDContext>,
    );

    const dndContextProps = DndContext.mock.calls[0]?.[0];
    dndContextProps.onDragAbort();

    expect(mockTogglePointerMovementTracking).toHaveBeenCalledWith(false);
    expect(isDraggingEvent$.next).toHaveBeenCalledWith(false);
  });
});

afterAll(() => {
  mock.restore();
});
