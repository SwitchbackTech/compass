import { DndContext, useSensor } from "@dnd-kit/core";
import { render, screen } from "@testing-library/react";
import { isDraggingEvent$ } from "@web/common/hooks/useIsDraggingEvent";
import { usePointerPosition } from "@web/common/hooks/usePointerPosition";
import { DNDContext } from "@web/components/DND/DNDContext";

jest.mock("@web/common/hooks/usePointerPosition");
jest.mock("@web/common/hooks/useIsDraggingEvent", () => ({
  isDraggingEvent$: {
    next: jest.fn(),
  },
}));

jest.mock("@dnd-kit/core", () => ({
  DndContext: jest.fn(({ children }) => (
    <div data-testid="dnd-context">{children}</div>
  )),
  KeyboardSensor: "KeyboardSensor",
  MouseSensor: "MouseSensor",
  TouchSensor: "TouchSensor",
  useSensor: jest.fn(),
  useSensors: jest.fn(),
}));

describe("DNDContext", () => {
  const mockTogglePointerMovementTracking = jest.fn();

  beforeEach(() => {
    (usePointerPosition as jest.Mock).mockReturnValue({
      togglePointerMovementTracking: mockTogglePointerMovementTracking,
    });
    mockTogglePointerMovementTracking.mockClear();
    (isDraggingEvent$.next as jest.Mock).mockClear();
    (useSensor as jest.Mock).mockClear();
    (DndContext as unknown as jest.Mock).mockClear();
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
    const calls = (useSensor as jest.Mock).mock.calls;
    const activationCall = calls.find(
      (call) => call[1] && call[1].onActivation,
    );

    expect(activationCall).toBeDefined();
    const onActivation = activationCall[1].onActivation;

    onActivation();

    expect(mockTogglePointerMovementTracking).toHaveBeenCalledWith(true);
    expect(isDraggingEvent$.next).toHaveBeenCalledWith(true);
  });

  it("calls togglePointerMovementTracking(false) and isDraggingEvent$.next(false) on deactivation via onDragEnd", () => {
    render(
      <DNDContext>
        <div>Child</div>
      </DNDContext>,
    );

    const dndContextProps = (DndContext as unknown as jest.Mock).mock
      .calls[0][0];
    const onDragEnd = dndContextProps.onDragEnd;

    onDragEnd();

    expect(mockTogglePointerMovementTracking).toHaveBeenCalledWith(false);
    expect(isDraggingEvent$.next).toHaveBeenCalledWith(false);
  });

  it("calls togglePointerMovementTracking(false) and isDraggingEvent$.next(false) on deactivation via onDragCancel", () => {
    render(
      <DNDContext>
        <div>Child</div>
      </DNDContext>,
    );

    const dndContextProps = (DndContext as unknown as jest.Mock).mock
      .calls[0][0];
    const onDragCancel = dndContextProps.onDragCancel;

    onDragCancel();

    expect(mockTogglePointerMovementTracking).toHaveBeenCalledWith(false);
    expect(isDraggingEvent$.next).toHaveBeenCalledWith(false);
  });

  it("calls togglePointerMovementTracking(false) and isDraggingEvent$.next(false) on deactivation via onDragAbort", () => {
    render(
      <DNDContext>
        <div>Child</div>
      </DNDContext>,
    );

    const dndContextProps = (DndContext as unknown as jest.Mock).mock
      .calls[0][0];
    const onDragAbort = dndContextProps.onDragAbort;

    onDragAbort();

    expect(mockTogglePointerMovementTracking).toHaveBeenCalledWith(false);
    expect(isDraggingEvent$.next).toHaveBeenCalledWith(false);
  });
});
