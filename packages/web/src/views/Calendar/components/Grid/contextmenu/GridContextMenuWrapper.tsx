import React from "react";
import { useState } from "react";
import {
  useFloating,
  autoUpdate,
  offset,
  shift,
  flip,
} from "@floating-ui/react";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { useAppSelector } from "@web/store/store.hooks";
import ContextMenu from "./ContextMenu";
import { getCalendarEventIdFromElement } from "@web/common/utils/event.util";
import { selectGridEvents } from "@web/ducks/events/selectors/event.selectors";

const GridContextMenuWrapper = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const timedEvents = useAppSelector(selectGridEvents);
  const [event, setEvent] = useState<Schema_GridEvent | null>(null); // TODO: Should instead use draft event in redux store
  const [isOpen, setIsOpen] = useState(false);

  const { refs, x, y, context } = useFloating({
    placement: "right-start",
    middleware: [offset(5), flip(), shift()],
    open: isOpen,
    onOpenChange: setIsOpen,
    whileElementsMounted: autoUpdate,
  });

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const calendarEventId = getCalendarEventIdFromElement(target);
    const hasClickedOnCalendarEvent = !!calendarEventId;

    if (hasClickedOnCalendarEvent) {
      e.preventDefault();

      const selectedEvent = timedEvents.find(
        (ev) => ev._id === calendarEventId
      );
      if (!selectedEvent) return; // TS guard

      // Create a virtual element where the user clicked
      refs.setReference({
        getBoundingClientRect: () => new DOMRect(e.clientX, e.clientY, 0, 0), // Position menu exactly at the click position
      });
      setEvent(selectedEvent);
      setIsOpen(true);
    }
  };

  const closeMenu = () => {
    setIsOpen(false);
    setEvent(null);
  };

  return (
    <div style={{ display: "contents" }} onContextMenu={handleContextMenu}>
      {children}
      {isOpen && event && (
        <ContextMenu
          ref={refs.setFloating}
          event={event}
          onClose={closeMenu}
          style={{
            position: "absolute",
            top: y,
            left: x,
          }}
          context={context}
        />
      )}
    </div>
  );
};

export default GridContextMenuWrapper;
