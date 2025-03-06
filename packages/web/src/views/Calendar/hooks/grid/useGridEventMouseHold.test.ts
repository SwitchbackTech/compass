import { renderHook } from "@testing-library/react";
import { Categories_Event } from "@core/types/event.types";
import { ID_GRID_MAIN } from "@web/common/constants/web.constants";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import {
  GRID_EVENT_MOUSE_HOLD_DELAY,
  GRID_EVENT_MOUSE_HOLD_MOVE_THRESHOLD,
  useGridEventMouseHold,
} from "./useGridEventMouseHold";

describe("useGridEventMouseHold", () => {
  const onClick = jest.fn();
  const onDrag = jest.fn();
  const stopPropagation = jest.fn();

  const mockEvent = {
    _id: "123",
    position: {
      isOverlapping: false,
      widthMultiplier: 1,
      horizontalOrder: 1,
    },
  } as Schema_GridEvent;

  const mockMouseEvent = {
    target: document.getElementById(ID_GRID_MAIN),
    clientX: 0,
    clientY: 0,
    stopPropagation,
  } as unknown as React.MouseEvent;

  beforeEach(() => {
    jest.useFakeTimers();
    onClick.mockClear();
    onDrag.mockClear();
    stopPropagation.mockClear();

    // Mock the DOM element
    document.body.innerHTML = `<div id=${ID_GRID_MAIN}></div>`;
  });

  afterEach(() => {
    jest.useRealTimers();
    document.body.innerHTML = "";
  });

  it("should trigger click when mouse releases before hold delay", () => {
    const { result } = renderHook(() =>
      useGridEventMouseHold(Categories_Event.TIMED, onClick, onDrag),
    );

    result.current.onMouseDown(mockMouseEvent, mockEvent);
    jest.advanceTimersByTime(GRID_EVENT_MOUSE_HOLD_DELAY - 1);

    // mouse up on the event
    const mainGrid = document.getElementById(ID_GRID_MAIN);
    const mouseupEvent = new MouseEvent("mouseup", {
      bubbles: true,
      cancelable: true,
    });
    mainGrid?.dispatchEvent(mouseupEvent);

    expect(onClick).toHaveBeenCalledWith(mockEvent);
    expect(onDrag).not.toHaveBeenCalled();
  });

  it("should trigger drag when mouse stays down after hold delay", () => {
    const { result } = renderHook(() =>
      useGridEventMouseHold(Categories_Event.TIMED, onClick, onDrag),
    );

    result.current.onMouseDown(mockMouseEvent, mockEvent);
    jest.advanceTimersByTime(GRID_EVENT_MOUSE_HOLD_DELAY + 1);

    expect(onDrag).toHaveBeenCalledWith(mockEvent);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("should trigger drag when mouse moves before hold delay", () => {
    const { result } = renderHook(() =>
      useGridEventMouseHold(Categories_Event.TIMED, onClick, onDrag),
    );

    result.current.onMouseDown(mockMouseEvent, mockEvent);
    jest.advanceTimersByTime(GRID_EVENT_MOUSE_HOLD_DELAY - 1);

    // move the event beyond the threshold
    const mainGrid = document.getElementById(ID_GRID_MAIN);
    const mousemoveEvent = new MouseEvent("mousemove", {
      bubbles: true,
      cancelable: true,
      clientX: GRID_EVENT_MOUSE_HOLD_MOVE_THRESHOLD + 1,
      clientY: GRID_EVENT_MOUSE_HOLD_MOVE_THRESHOLD + 1,
    });
    mainGrid?.dispatchEvent(mousemoveEvent);

    expect(onDrag).toHaveBeenCalledWith(mockEvent);
    expect(onClick).not.toHaveBeenCalled();
  });
});
