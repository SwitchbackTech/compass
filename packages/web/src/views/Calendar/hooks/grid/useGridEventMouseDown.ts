import { MouseEvent as ReactMouseEvent, useRef } from "react";
import { Categories_Event } from "@core/types/event.types";
import {
  ID_GRID_ALLDAY_ROW,
  ID_GRID_MAIN,
} from "@web/common/constants/web.constants";
import { PartialMouseEvent } from "@web/common/types/util.types";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { isEventFormOpen } from "@web/common/utils";
import { getElemById } from "@web/common/utils/grid.util";

export const GRID_EVENT_MOUSE_HOLD_DELAY = 750; // ms
export const GRID_EVENT_MOUSE_HOLD_MOVE_THRESHOLD = 25; // pixels

const elementEventTypeMap = {
  [Categories_Event.TIMED]: ID_GRID_MAIN,
  [Categories_Event.ALLDAY]: ID_GRID_ALLDAY_ROW,
};

type HandleDragHandlers = {
  onMouseMove: (e: MouseEvent) => void;
  onMouseUp: () => void;
};

/**
 * Hook that differentiates between click and drag actions based on mouse behavior:
 * - Quick press and release triggers a click
 * - Hold for delay or move beyond threshold triggers drag
 * - When form is open, only allows drag if mouse is still held down
 */
export const useGridEventMouseDown = (
  eventType: Categories_Event.TIMED | Categories_Event.ALLDAY,
  onClick: (event: Schema_GridEvent) => void,
  onDrag: (event: Schema_GridEvent, moveEvent: PartialMouseEvent) => void,
  delay: number = GRID_EVENT_MOUSE_HOLD_DELAY,
) => {
  const timeoutId = useRef<NodeJS.Timeout | null>(null);
  const mouseMoved = useRef<boolean>(false);
  const elementId = elementEventTypeMap[eventType];
  const targetRef = useRef<EventTarget | null>(null);

  const hasExceededMoveThreshold = (
    currentX: number,
    currentY: number,
    initialX: number,
    initialY: number,
  ) => {
    const deltaX = Math.abs(currentX - initialX);
    const deltaY = Math.abs(currentY - initialY);
    return (
      deltaX > GRID_EVENT_MOUSE_HOLD_MOVE_THRESHOLD ||
      deltaY > GRID_EVENT_MOUSE_HOLD_MOVE_THRESHOLD
    );
  };

  const cleanup = (
    element: HTMLElement,
    onMouseMove: (e: MouseEvent) => void,
    onMouseUp: () => void,
  ) => {
    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
    }
    element.removeEventListener("mousemove", onMouseMove);
    element.removeEventListener("mouseup", onMouseUp);
  };

  const handleDrag = (
    event: Schema_GridEvent,
    element: HTMLElement,
    currentEvent: MouseEvent,
    handlers: HandleDragHandlers,
  ) => {
    // If form is open, only allow drag if mouse is still held
    if (isEventFormOpen()) {
      const isMouseDown = document.querySelector(":active") !== null;
      if (!isMouseDown) {
        cleanup(element, handlers.onMouseMove, handlers.onMouseUp);
        return;
      }
    }
    mouseMoved.current = true;

    onDrag(event, {
      clientX: currentEvent.clientX,
      clientY: currentEvent.clientY,
      currentTarget: targetRef.current as EventTarget & Element,
    });
  };

  const onMouseDown = (e: ReactMouseEvent, event: Schema_GridEvent) => {
    e.stopPropagation();
    targetRef.current = e.currentTarget;
    const element = getElemById(elementId);
    const initialX = e.clientX;
    const initialY = e.clientY;
    mouseMoved.current = false;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (
        hasExceededMoveThreshold(
          moveEvent.clientX,
          moveEvent.clientY,
          initialX,
          initialY,
        )
      ) {
        mouseMoved.current = true;
        if (timeoutId.current) {
          clearTimeout(timeoutId.current);
        }
        onDrag(event, {
          clientX: moveEvent.clientX,
          clientY: moveEvent.clientY,
          currentTarget: targetRef.current as EventTarget & Element,
        });
        cleanup(element, onMouseMove, onMouseUp);
      }
    };

    const onMouseUp = () => {
      if (!mouseMoved.current && timeoutId.current) {
        clearTimeout(timeoutId.current);
        onClick(event);
      }
      cleanup(element, onMouseMove, onMouseUp);
    };

    // Start hold timer
    timeoutId.current = setTimeout(() => {
      if (!mouseMoved.current) {
        // Need a current MouseEvent for the timeout drag case
        const currentEvent = new MouseEvent("mousemove", {
          clientX: initialX,
          clientY: initialY,
        });

        handleDrag(event, element, currentEvent, { onMouseMove, onMouseUp });
      }
    }, delay);

    // Set up event listeners
    element.addEventListener("mousemove", onMouseMove);
    element.addEventListener("mouseup", onMouseUp);
  };

  return { onMouseDown };
};
