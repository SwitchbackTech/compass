import React, { ReactNode, useState, useRef } from "react";
import { getCalendarEventIdFromElement } from "@web/common/utils/event.util";
import ContextMenu from "./ContextMenu";
import { useAppSelector } from "@web/store/store.hooks";
import { selectGridEvents } from "@web/ducks/events/selectors/event.selectors";
import { Schema_GridEvent } from "@web/common/types/web.event.types";

export interface ContextMenuPosition {
  x: number;
  y: number;
}

interface GridContextMenuWrapper {
  children: ReactNode;
}

const GridContextMenuWrapper = ({ children }: GridContextMenuWrapper) => {
  const timedEvents = useAppSelector(selectGridEvents);
  const [contextMenuPos, setContextMenuPos] =
    useState<ContextMenuPosition | null>(null);
  const [event, setEvent] = useState<Schema_GridEvent | null>(null);

  const wrapperRef = useRef(null);

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const calendarEventId = getCalendarEventIdFromElement(target);
    const hasClickedOnCalendarEvent = !!calendarEventId;

    if (hasClickedOnCalendarEvent) {
      e.preventDefault();

      const event = timedEvents.find((e) => e._id === calendarEventId);
      if (!event) return; // TS guard

      setContextMenuPos({
        x: e.pageX,
        y: e.pageY,
      });
      setEvent(event);
    }
  };

  const closeMenu = () => {
    setContextMenuPos(null);
    setEvent(null);
  };
  return (
    <div
      ref={wrapperRef}
      style={{ display: "contents" }}
      onContextMenu={handleContextMenu}
    >
      {children}
      {contextMenuPos && event && (
        <ContextMenu
          position={{ x: contextMenuPos.x, y: contextMenuPos.y }}
          event={event}
          onClose={closeMenu}
        />
      )}
    </div>
  );
};
export default GridContextMenuWrapper;
