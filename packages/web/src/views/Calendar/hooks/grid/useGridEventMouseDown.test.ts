import { renderHook } from "@testing-library/react";
import { Categories_Event } from "@core/types/event.types";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import * as utils from "@web/common/utils";
import * as gridUtils from "@web/common/utils/grid.util";
import {
  GRID_EVENT_MOUSE_HOLD_DELAY,
  GRID_EVENT_MOUSE_HOLD_MOVE_THRESHOLD,
  useGridEventMouseDown,
} from "./useGridEventMouseDown";

describe("useGridEventMouseDown", () => {
  const onClick = jest.fn();
  const onDrag = jest.fn();
  const stopPropagation = jest.fn();
  const mockGridElement = document.createElement("div");

  const mockEvent = {
    _id: "123",
    position: {
      isOverlapping: false,
      widthMultiplier: 1,
      horizontalOrder: 1,
    },
  } as Schema_GridEvent;

  const mockMouseEvent = {
    target: mockGridElement,
    clientX: 0,
    clientY: 0,
    stopPropagation,
  } as unknown as React.MouseEvent;

  beforeEach(() => {
    jest.useFakeTimers();
    onClick.mockClear();
    onDrag.mockClear();
    stopPropagation.mockClear();
    jest.spyOn(utils, "isEventFormOpen").mockReturnValue(false);
    jest.spyOn(gridUtils, "getElemById").mockReturnValue(mockGridElement);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("should trigger click when mouse releases before hold delay", () => {
    const { result } = renderHook(() =>
      useGridEventMouseDown(Categories_Event.TIMED, onClick, onDrag),
    );

    result.current.onMouseDown(mockMouseEvent, mockEvent);
    jest.advanceTimersByTime(GRID_EVENT_MOUSE_HOLD_DELAY - 1);

    // mouse up on the event
    const mouseupEvent = new MouseEvent("mouseup", {
      bubbles: true,
      cancelable: true,
    });
    mockGridElement.dispatchEvent(mouseupEvent);

    expect(onClick).toHaveBeenCalledWith(mockEvent);
    expect(onDrag).not.toHaveBeenCalled();
  });

  it("should trigger drag when mouse stays down after hold delay", () => {
    const { result } = renderHook(() =>
      useGridEventMouseDown(Categories_Event.TIMED, onClick, onDrag),
    );

    result.current.onMouseDown(mockMouseEvent, mockEvent);
    jest.advanceTimersByTime(GRID_EVENT_MOUSE_HOLD_DELAY + 1);

    expect(onDrag).toHaveBeenCalledWith(mockEvent);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("should trigger drag when mouse moves before hold delay", () => {
    const { result } = renderHook(() =>
      useGridEventMouseDown(Categories_Event.TIMED, onClick, onDrag),
    );

    result.current.onMouseDown(mockMouseEvent, mockEvent);
    jest.advanceTimersByTime(GRID_EVENT_MOUSE_HOLD_DELAY - 1);

    // move the event beyond the threshold
    const mousemoveEvent = new MouseEvent("mousemove", {
      bubbles: true,
      cancelable: true,
      clientX: GRID_EVENT_MOUSE_HOLD_MOVE_THRESHOLD + 1,
      clientY: GRID_EVENT_MOUSE_HOLD_MOVE_THRESHOLD + 1,
    });
    mockGridElement.dispatchEvent(mousemoveEvent);

    expect(onDrag).toHaveBeenCalledWith(mockEvent);
    expect(onClick).not.toHaveBeenCalled();
  });

  describe("When form is open", () => {
    beforeEach(() => {
      jest.spyOn(utils, "isEventFormOpen").mockReturnValue(true);
    });

    it("should trigger drag when mouse is held down after delay", () => {
      const { result } = renderHook(() =>
        useGridEventMouseDown(Categories_Event.TIMED, onClick, onDrag),
      );

      // Mock :active state to simulate mouse still being down
      jest
        .spyOn(document, "querySelector")
        .mockReturnValue(document.createElement("div"));

      result.current.onMouseDown(mockMouseEvent, mockEvent);
      jest.advanceTimersByTime(GRID_EVENT_MOUSE_HOLD_DELAY + 1);

      expect(onDrag).toHaveBeenCalledWith(mockEvent);
      expect(onClick).not.toHaveBeenCalled();
    });

    it("should not trigger drag when mouse is released before delay", () => {
      const { result } = renderHook(() =>
        useGridEventMouseDown(Categories_Event.TIMED, onClick, onDrag),
      );

      result.current.onMouseDown(mockMouseEvent, mockEvent);

      // Mock :active state to simulate mouse not being down - do this AFTER onMouseDown
      jest.spyOn(document, "querySelector").mockReturnValue(null);

      jest.advanceTimersByTime(GRID_EVENT_MOUSE_HOLD_DELAY + 1);

      expect(onDrag).not.toHaveBeenCalled();
      expect(onClick).not.toHaveBeenCalled();
    });

    it("should not trigger drag when mouse moves", () => {
      const { result } = renderHook(() =>
        useGridEventMouseDown(Categories_Event.TIMED, onClick, onDrag),
      );

      result.current.onMouseDown(mockMouseEvent, mockEvent);

      // move the event beyond the threshold
      const mousemoveEvent = new MouseEvent("mousemove", {
        bubbles: true,
        cancelable: true,
        clientX: GRID_EVENT_MOUSE_HOLD_MOVE_THRESHOLD + 1,
        clientY: GRID_EVENT_MOUSE_HOLD_MOVE_THRESHOLD + 1,
      });
      mockGridElement.dispatchEvent(mousemoveEvent);

      expect(onDrag).not.toHaveBeenCalled();
      expect(onClick).not.toHaveBeenCalled();
    });
  });
});
