import { type MouseEvent as ReactMouseEvent, useRef } from "react";
import { type PartialMouseEvent } from "@web/common/types/util.types";
import { type GridEvent } from "@web/common/types/web.event.types";
import { isEventFormOpen } from "@web/common/utils/form/form.util";

export const GRID_EVENT_MOUSE_HOLD_DELAY = 750; // ms
export const GRID_EVENT_MOUSE_HOLD_MOVE_THRESHOLD = 25; // pixels

type HandleDragHandlers = {
  onMouseMove: (e: MouseEvent) => void;
  onMouseUp: () => void;
};

/**
 * Hook that differentiates between click and drag actions based on mouse behavior:
 * - Quick press and release triggers a click
 * - Hold for delay or move beyond threshold triggers drag
 * - When form is open, only allows drag if mouse is still held down
 *
 * Listeners attach to `document` so an all-day draft can start dragging when the
 * pointer leaves the all-day row toward the timed grid (element-scoped
 * mousemove would stop firing at the row boundary).
 */
export const useGridEventMouseDown = (
  onClick: (event: GridEvent) => void,
  onDrag: (event: GridEvent, moveEvent: PartialMouseEvent) => void,
  delay: number = GRID_EVENT_MOUSE_HOLD_DELAY,
) => {
  const timeoutId = useRef<NodeJS.Timeout | null>(null);
  const mouseMoved = useRef<boolean>(false);
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
    onMouseMove: (e: MouseEvent) => void,
    onMouseUp: () => void,
  ) => {
    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
    }
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  };

  const handleDrag = (
    event: GridEvent,
    currentEvent: MouseEvent,
    handlers: HandleDragHandlers,
  ) => {
    // If form is open, only allow drag if mouse is still held
    if (isEventFormOpen()) {
      const isMouseDown = document.querySelector(":active") !== null;
      if (!isMouseDown) {
        cleanup(handlers.onMouseMove, handlers.onMouseUp);
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

  const onMouseDown = (e: ReactMouseEvent, event: GridEvent) => {
    e.stopPropagation();
    targetRef.current = e.currentTarget;
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
        cleanup(onMouseMove, onMouseUp);
      }
    };

    const onMouseUp = () => {
      if (!mouseMoved.current && timeoutId.current) {
        clearTimeout(timeoutId.current);
        onClick(event);
      }
      cleanup(onMouseMove, onMouseUp);
    };

    // Start hold timer
    timeoutId.current = setTimeout(() => {
      if (!mouseMoved.current) {
        // Need a current MouseEvent for the timeout drag case
        const currentEvent = new MouseEvent("mousemove", {
          clientX: initialX,
          clientY: initialY,
        });

        handleDrag(event, currentEvent, { onMouseMove, onMouseUp });
      }
    }, delay);

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  return { onMouseDown };
};
