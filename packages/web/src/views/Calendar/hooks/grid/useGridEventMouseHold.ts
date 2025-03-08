import { MouseEvent as ReactMouseEvent, useRef } from "react";
import { Categories_Event } from "@core/types/event.types";
import {
  ID_GRID_ALLDAY_ROW,
  ID_GRID_MAIN,
} from "@web/common/constants/web.constants";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { isEventFormOpen } from "@web/common/utils";
import { getElemById } from "@web/common/utils/grid.util";

export const GRID_EVENT_MOUSE_HOLD_DELAY = 750; // ms
export const GRID_EVENT_MOUSE_HOLD_MOVE_THRESHOLD = 25; // pixels

const elementEventTypeMap = {
  [Categories_Event.TIMED]: ID_GRID_MAIN,
  [Categories_Event.ALLDAY]: ID_GRID_ALLDAY_ROW,
};

/**
 * Calls either the click or drag handler based on how long the mouse is held down.
 */
export const useGridEventMouseHold = (
  eventType: Categories_Event.TIMED | Categories_Event.ALLDAY,
  onClick: (event: Schema_GridEvent) => void,
  onDrag: (event: Schema_GridEvent) => void,
  delay: number = GRID_EVENT_MOUSE_HOLD_DELAY,
) => {
  const elementId = elementEventTypeMap[eventType];
  const timeoutId = useRef<NodeJS.Timeout | null>(null);
  const mouseMoved = useRef<boolean>(false);

  const onMouseDown = (e: ReactMouseEvent, event: Schema_GridEvent) => {
    e.stopPropagation();

    mouseMoved.current = false;
    const initialX = e.clientX;
    const initialY = e.clientY;

    timeoutId.current = setTimeout(() => {
      if (!mouseMoved.current) {
        if (isEventFormOpen()) {
          const isMouseDown = document.querySelector(":active") !== null;
          if (isMouseDown) {
            mouseMoved.current = true;
            onDrag(event);
          } else {
            cleanup();
            return;
          }
        } else {
          mouseMoved.current = true;
          onDrag(event);
        }
      }
    }, delay);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = Math.abs(moveEvent.clientX - initialX);
      const deltaY = Math.abs(moveEvent.clientY - initialY);

      if (
        deltaX > GRID_EVENT_MOUSE_HOLD_MOVE_THRESHOLD ||
        deltaY > GRID_EVENT_MOUSE_HOLD_MOVE_THRESHOLD
      ) {
        mouseMoved.current = true;
        if (timeoutId.current) {
          clearTimeout(timeoutId.current);
        }
        if (isEventFormOpen()) {
          cleanup();
          return;
        }
        onDrag(event);
        cleanup();
      }
    };

    const onMouseUp = () => {
      if (!mouseMoved.current && timeoutId.current) {
        clearTimeout(timeoutId.current);
        onClick(event);
      }
      cleanup();
    };

    const cleanup = () => {
      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
      }

      getElemById(elementId).removeEventListener("mousemove", onMouseMove);
      getElemById(elementId).removeEventListener("mouseup", onMouseUp);
    };

    getElemById(elementId).addEventListener("mousemove", onMouseMove);
    getElemById(elementId).addEventListener("mouseup", onMouseUp);
  };

  return { onMouseDown };
};
