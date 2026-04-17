import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { renderHook } from "@testing-library/react";
import { Categories_Event } from "@core/types/event.types";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import * as utils from "@web/common/utils/form/form.util";
import * as gridUtils from "@web/common/utils/grid/grid.util";
import {
  GRID_EVENT_MOUSE_HOLD_DELAY,
  GRID_EVENT_MOUSE_HOLD_MOVE_THRESHOLD,
  useGridEventMouseDown,
} from "./useGridEventMouseDown";

describe("useGridEventMouseDown", () => {
  const onClick = mock();
  const onDrag = mock();
  const stopPropagation = mock();
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

  // Create partial mouse event object for assertion matching
  const partialMouseEvent = {
    clientX: 0,
    clientY: 0,
    currentTarget: undefined,
  };

  const wait = (ms: number) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    });

  beforeEach(() => {
    onClick.mockClear();
    onDrag.mockClear();
    stopPropagation.mockClear();
    spyOn(utils, "isEventFormOpen").mockReturnValue(false);
    spyOn(gridUtils, "getElemById").mockReturnValue(mockGridElement);
  });

  afterEach(() => {
    mock.restore();
  });

  it("should trigger click when mouse releases before hold delay", async () => {
    const { result } = renderHook(() =>
      useGridEventMouseDown(Categories_Event.TIMED, onClick, onDrag),
    );

    result.current.onMouseDown(mockMouseEvent, mockEvent);
    await wait(GRID_EVENT_MOUSE_HOLD_DELAY - 1);

    // mouse up on the event
    const mouseupEvent = new MouseEvent("mouseup", {
      bubbles: true,
      cancelable: true,
    });
    mockGridElement.dispatchEvent(mouseupEvent);

    expect(onClick).toHaveBeenCalledWith(mockEvent);
    expect(onDrag).not.toHaveBeenCalled();
  });

  it("should trigger drag when mouse stays down after hold delay", async () => {
    const { result } = renderHook(() =>
      useGridEventMouseDown(Categories_Event.TIMED, onClick, onDrag),
    );

    result.current.onMouseDown(mockMouseEvent, mockEvent);
    return wait(GRID_EVENT_MOUSE_HOLD_DELAY + 1).then(() => {
      expect(onDrag).toHaveBeenCalledWith(mockEvent, partialMouseEvent);
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  it("should trigger drag when mouse moves before hold delay", async () => {
    const { result } = renderHook(() =>
      useGridEventMouseDown(Categories_Event.TIMED, onClick, onDrag),
    );

    result.current.onMouseDown(mockMouseEvent, mockEvent);
    return wait(GRID_EVENT_MOUSE_HOLD_DELAY - 1).then(() => {
      // move the event beyond the threshold
      const mousemoveEvent = new MouseEvent("mousemove", {
        bubbles: true,
        cancelable: true,
        clientX: GRID_EVENT_MOUSE_HOLD_MOVE_THRESHOLD + 1,
        clientY: GRID_EVENT_MOUSE_HOLD_MOVE_THRESHOLD + 1,
      });
      mockGridElement.dispatchEvent(mousemoveEvent);

      // expect.objectContaining to match the mousemoveEvent properties
      expect(onDrag).toHaveBeenCalledWith(
        mockEvent,
        expect.objectContaining({
          clientX: GRID_EVENT_MOUSE_HOLD_MOVE_THRESHOLD + 1,
          clientY: GRID_EVENT_MOUSE_HOLD_MOVE_THRESHOLD + 1,
        }),
      );
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe("When form is open", () => {
    beforeEach(() => {
      spyOn(utils, "isEventFormOpen").mockReturnValue(true);
    });

    it("should trigger drag when mouse is held down after delay", async () => {
      const { result } = renderHook(() =>
        useGridEventMouseDown(Categories_Event.TIMED, onClick, onDrag),
      );

      // Mock :active state to simulate mouse still being down
      spyOn(document, "querySelector").mockReturnValue(document.createElement("div"));

      result.current.onMouseDown(mockMouseEvent, mockEvent);
      return wait(GRID_EVENT_MOUSE_HOLD_DELAY + 1).then(() => {
        expect(onDrag).toHaveBeenCalledWith(mockEvent, partialMouseEvent);
        expect(onClick).not.toHaveBeenCalled();
      });
    });

    it("should not trigger drag when mouse is released before delay", async () => {
      const { result } = renderHook(() =>
        useGridEventMouseDown(Categories_Event.TIMED, onClick, onDrag),
      );

      result.current.onMouseDown(mockMouseEvent, mockEvent);

      // Mock :active state to simulate mouse not being down - do this AFTER onMouseDown
      spyOn(document, "querySelector").mockReturnValue(null);

      return wait(GRID_EVENT_MOUSE_HOLD_DELAY + 1).then(() => {
        expect(onDrag).not.toHaveBeenCalled();
        expect(onClick).not.toHaveBeenCalled();
      });
    });

    it("should not trigger drag when mouse moves", async () => {
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

      expect(onClick).not.toHaveBeenCalled();
    });
  });
});
