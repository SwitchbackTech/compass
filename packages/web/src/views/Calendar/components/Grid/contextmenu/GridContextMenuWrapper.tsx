import React, { ReactNode, useState, useRef } from "react";
import { getCalendarEventIdFromElement } from "@web/common/utils/event.util";
import ContextMenu from "./ContextMenu";

export interface ContextMenuPosition {
  x: number;
  y: number;
}

const GridContextMenuWrapper = ({ children }: { children: ReactNode }) => {
  const [contextMenuPos, setContextMenuPos] =
    useState<ContextMenuPosition | null>(null);

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
      setContextMenuPos({
        x: e.pageX,
        y: e.pageY,
      });
    }
  };

  const closeMenu = () => {
    setContextMenuPos(null);
  };

  return (
    <div
      ref={wrapperRef}
      style={{ display: "contents" }}
      onContextMenu={handleContextMenu}
    >
      {children}
      {contextMenuPos && (
        <ContextMenu
          position={{ x: contextMenuPos.x, y: contextMenuPos.y }}
          onClose={closeMenu}
        />
      )}
    </div>
  );
};
export default GridContextMenuWrapper;
