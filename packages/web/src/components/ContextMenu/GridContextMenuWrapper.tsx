import React, { useState } from "react";
import {
  useFloating,
  autoUpdate,
  offset,
  shift,
  flip,
} from "@floating-ui/react";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import {
  assembleGridEvent,
  getCalendarEventIdFromElement,
  isOptimisticEvent,
} from "@web/common/utils/event.util";
import {
  selectAllDayEvents,
  selectGridEvents,
} from "@web/ducks/events/selectors/event.selectors";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { selectDraft } from "@web/ducks/events/selectors/draft.selectors";
import { ContextMenu } from "./ContextMenu";

export const ContextMenuWrapper = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const dispatch = useAppDispatch();
  const timedEvents = useAppSelector(selectGridEvents);
  const allDayEvents = useAppSelector(selectAllDayEvents);
  const draftEvent = useAppSelector(selectDraft);

  const [isOpen, setIsOpen] = useState(false);

  const { refs, x, y, context } = useFloating({
    placement: "right-start",
    middleware: [offset(5), flip(), shift()],
    open: isOpen,
    onOpenChange: setIsOpen,
    whileElementsMounted: autoUpdate,
  });

  const getSelectedEvent = (eventId: string) => {
    const selectedEvent =
      timedEvents.find((ev) => ev._id === eventId) ||
      allDayEvents.find((ev) => ev._id === eventId);

    if (!selectedEvent) {
      throw new Error("Selected event not found");
    }

    return selectedEvent;
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) {
      console.error("target is not an HTMLElement");
      return;
    }
    const eventId = getCalendarEventIdFromElement(target);
    const hasClickedOnEvent = !!eventId;

    if (hasClickedOnEvent) {
      e.preventDefault();

      const event = getSelectedEvent(eventId);
      if (isOptimisticEvent(event)) return;

      // Create a virtual element where the user clicked
      refs.setReference({
        getBoundingClientRect: () => new DOMRect(e.clientX, e.clientY, 0, 0), // Position menu exactly at the click position
      });

      dispatch(
        draftSlice.actions.start({
          event,
        }),
      );

      setIsOpen(true);
    }
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  return (
    <div style={{ display: "contents" }} onContextMenu={handleContextMenu}>
      {children}
      {isOpen && (
        <ContextMenu
          ref={refs.setFloating}
          event={draftEvent ? assembleGridEvent(draftEvent) : undefined}
          style={{
            position: "absolute",
            top: `${y}px`,
            left: `${x}px`,
          }}
          context={context}
          close={closeMenu}
          onOutsideClick={() => {
            closeMenu();
            dispatch(draftSlice.actions.discard({}));
          }}
        />
      )}
    </div>
  );
};
