import React, { createContext, useContext, useState } from "react";
import {
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
} from "@floating-ui/react";
import { Schema_Event } from "@core/types/event.types";
import {
  getCursorPosition,
  getMousePointRef,
} from "@web/common/context/mouse-position";
import { EventContextMenu } from "@web/views/Day/components/ContextMenu/EventContextMenu";

interface EventContextMenuContextValue {
  isOpen: boolean;
  openContextMenu: (event: Schema_Event) => void;
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

  const openContextMenu = (event: Schema_Event) => {
    // Create a virtual element where the user clicked
    refs.setReference(getMousePointRef(getCursorPosition()));

    setSelectedEvent(event);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setSelectedEvent(null);
  };

  return (
    <EventContextMenuContext.Provider value={{ openContextMenu, isOpen }}>
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
