import React, { useState } from "react";
import {
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
} from "@floating-ui/react";
import { Schema_Event } from "@core/types/event.types";
import { useDayEvents } from "../../data/day.data";
import { useDateInView } from "../../hooks/navigation/useDateInView";
import { getEventIdFromElement } from "../../util/event.locate";
import { EventContextMenu } from "./EventContextMenu";

interface EventContextMenuWrapperProps {
  children: React.ReactNode;
}

export const EventContextMenuWrapper = ({
  children,
}: EventContextMenuWrapperProps) => {
  const dateInView = useDateInView();
  const { events } = useDayEvents(dateInView);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Schema_Event | null>(null);

  const { refs, x, y, context } = useFloating({
    placement: "right-start",
    middleware: [offset(5), flip(), shift()],
    open: isOpen,
    onOpenChange(newIsOpen, _, reason) {
      setIsOpen(newIsOpen);
      if (newIsOpen === false && reason === "escape-key") {
        handleClose();
      }
    },
    whileElementsMounted: autoUpdate,
  });

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) {
      console.error("target is not a HTMLElement");
      return;
    }

    // Get event ID from data attribute
    const eventId = getEventIdFromElement(target);
    if (!eventId) {
      return;
    }

    // Find the event by ID
    const event = events.find((ev) => ev._id === eventId);
    if (!event) {
      return;
    }

    e.preventDefault();

    // Create a virtual element where the user clicked
    refs.setReference({
      getBoundingClientRect: () => ({
        x: e.clientX,
        y: e.clientY,
        top: e.clientY,
        left: e.clientX,
        bottom: e.clientY,
        right: e.clientX,
        width: 0,
        height: 0,
        toJSON: () => ({}),
      }),
    });

    setSelectedEvent(event);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setSelectedEvent(null);
  };

  return (
    <div style={{ display: "contents" }} onContextMenu={handleContextMenu}>
      {children}
      {isOpen && selectedEvent && (
        <EventContextMenu
          ref={refs.setFloating}
          event={selectedEvent}
          style={{
            position: "absolute",
            top: `${y}px`,
            left: `${x}px`,
          }}
          context={context}
          close={handleClose}
          onOutsideClick={handleClose}
        />
      )}
    </div>
  );
};
