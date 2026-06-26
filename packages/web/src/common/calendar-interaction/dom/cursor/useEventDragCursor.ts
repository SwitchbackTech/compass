import { useEffect } from "react";
import { useIsDraggingEvent } from "./eventDragCursorState";

/**
 * The single place that applies the `move` cursor while an event is dragged.
 *
 * Mounted once at the app root so it is view-independent (works in both `/day`
 * and `/week`). It reads the shared drag signal and toggles the document
 * cursor; no other code should write the `move` cursor.
 */
export const useEventDragCursor = () => {
  const isDraggingEvent = useIsDraggingEvent();

  useEffect(() => {
    document.body.style.cursor = isDraggingEvent ? "move" : "";
    document.documentElement.style.cursor = isDraggingEvent ? "move" : "";

    return () => {
      document.body.style.cursor = "";
      document.documentElement.style.cursor = "";
    };
  }, [isDraggingEvent]);
};
