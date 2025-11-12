import React, { createContext, useContext, useState } from "react";
import {
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
} from "@floating-ui/react";
import { Schema_Event } from "@core/types/event.types";
import { EventContextMenu } from "./EventContextMenu";

interface EventContextMenuContextValue {
  openContextMenu: (
    event: Schema_Event,
    position: { x: number; y: number },
  ) => void;
}

const EventContextMenuContext = createContext<
  EventContextMenuContextValue | undefined
>(undefined);

export const useEventContextMenu = () => {
  const context = useContext(EventContextMenuContext);
  if (!context) {
    throw new Error(
      "useEventContextMenu must be used within EventContextMenuProvider",
    );
  }
  return context;
};

export const EventContextMenuProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
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

  const openContextMenu = (
    event: Schema_Event,
    position: { x: number; y: number },
  ) => {
    // Create a virtual element where the user clicked
    refs.setReference({
      getBoundingClientRect: () => ({
        x: position.x,
        y: position.y,
        top: position.y,
        left: position.x,
        bottom: position.y,
        right: position.x,
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
    <EventContextMenuContext.Provider value={{ openContextMenu }}>
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
    </EventContextMenuContext.Provider>
  );
};
