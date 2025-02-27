import { MouseEvent as ReactMouseEvent, useRef } from "react";
import { Categories_Event } from "@core/types/event.types";
import {
  ID_GRID_ALLDAY_ROW,
  ID_GRID_MAIN,
} from "@web/common/constants/web.constants";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { getElemById } from "@web/common/utils/grid.util";

const GRID_EVENT_MOUSE_HOLD_DELAY = 750;

export const useGridEventMouseHold = (
  cb: (event: Schema_GridEvent) => void,
  eventType: Categories_Event.TIMED | Categories_Event.ALLDAY,
  delay: number = GRID_EVENT_MOUSE_HOLD_DELAY,
) => {
  const elementEventTypeMap = {
    [Categories_Event.TIMED]: ID_GRID_MAIN,
    [Categories_Event.ALLDAY]: ID_GRID_ALLDAY_ROW,
  };

  const elementId = elementEventTypeMap[eventType];

  const timeoutId = useRef<NodeJS.Timeout | null>(null);
  const mouseMoved = useRef<boolean>(false);

  const handleCallback = (event: Schema_GridEvent) => {
    cb(event);
  };

  const onMouseDown = (e: ReactMouseEvent, event: Schema_GridEvent) => {
    e.stopPropagation();
    mouseMoved.current = false;

    timeoutId.current = setTimeout(() => {
      if (!mouseMoved.current) {
        handleCallback(event);
      }
    }, delay);

    const onMouseMove = () => {
      mouseMoved.current = true;
      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
      }
      handleCallback(event);
      cleanup();
    };

    const onMouseUp = () => {
      cleanup();

      // Manually dispatch a new 'mouseup' event to ensure other listeners execute
      const _event = new MouseEvent("mouseup", {
        bubbles: true,
        cancelable: true,
        button: 0,
        clientX: e.clientX,
        clientY: e.clientY,
      });

      // Delay dispatching the new event to let React flush updates
      setTimeout(() => {
        getElemById(elementId).dispatchEvent(_event);
      }, 1);
    };

    const cleanup = () => {
      handleCallback(event);

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
