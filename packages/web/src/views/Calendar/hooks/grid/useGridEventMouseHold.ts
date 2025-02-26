import { MouseEvent as ReactMouseEvent, useRef } from "react";
import { ID_GRID_MAIN } from "@web/common/constants/web.constants";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { getElemById } from "@web/common/utils/grid.util";
import { GRID_EVENT_MOUSE_HOLD_DELAY } from "@web/views/Calendar/layout.constants";

export const useGridEventMouseHold = (
  cb: (event: Schema_GridEvent) => void,
  delay: number = GRID_EVENT_MOUSE_HOLD_DELAY,
) => {
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
        getElemById(ID_GRID_MAIN).dispatchEvent(_event);
      }, 1);
    };

    const cleanup = () => {
      handleCallback(event);

      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
      }

      getElemById(ID_GRID_MAIN).removeEventListener("mousemove", onMouseMove);
      getElemById(ID_GRID_MAIN).removeEventListener("mouseup", onMouseUp);
    };

    getElemById(ID_GRID_MAIN).addEventListener("mousemove", onMouseMove);
    getElemById(ID_GRID_MAIN).addEventListener("mouseup", onMouseUp);
  };

  return { onMouseDown };
};
