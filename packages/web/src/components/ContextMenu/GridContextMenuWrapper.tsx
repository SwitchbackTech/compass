import React, { useState } from "react";
import {
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
} from "@floating-ui/react";
import { Categories_Event } from "@core/types/event.types";
import {
  assembleGridEvent,
  getCalendarEventIdFromElement,
} from "@web/common/utils/event/event.util";
import { selectDraft } from "@web/ducks/events/selectors/draft.selectors";
import {
  selectAllDayEvents,
  selectGridEvents,
} from "@web/ducks/events/selectors/event.selectors";
import { selectSomedayEvents } from "@web/ducks/events/selectors/someday.selectors";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { ContextMenu } from "./ContextMenu";

export const ContextMenuWrapper = ({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) => {
  const dispatch = useAppDispatch();
  const timedEvents = useAppSelector(selectGridEvents);
  const allDayEvents = useAppSelector(selectAllDayEvents);
  const somedayEvents = useAppSelector(selectSomedayEvents);
  const pendingEventIds = useAppSelector(
    (state) => state.events.pendingEvents.eventIds,
  );

  const draftEvent = useAppSelector(selectDraft);

  const [isOpen, setIsOpen] = useState(false);

  const { refs, x, y, context } = useFloating({
    placement: "right-start",
    middleware: [offset(5), flip(), shift()],
    open: isOpen,
    onOpenChange(newIsOpen, _, reason) {
      setIsOpen(newIsOpen);
      if (newIsOpen === false && reason === "escape-key") {
        handleDiscard();
      }
    },
    whileElementsMounted: autoUpdate,
  });

  const getSelectedEvent = (eventId: string) => {
    const selectedEvent =
      timedEvents.find((ev) => ev._id === eventId) ||
      allDayEvents.find((ev) => ev._id === eventId) ||
      Object.values(somedayEvents).find((ev) => ev._id === eventId);

    if (!selectedEvent) {
      throw new Error("Selected event not found");
    }

    return selectedEvent;
  };

  const handleDiscard = () => {
    closeMenu();
    dispatch(draftSlice.actions.discard({}));
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) {
      console.error("target is not a HTMLElement");
      return;
    }
    const eventId = getCalendarEventIdFromElement(target);
    const hasClickedOnEvent = !!eventId;

    if (hasClickedOnEvent) {
      e.preventDefault();

      const event = getSelectedEvent(eventId);
      const isPending = pendingEventIds.includes(eventId);
      if (isPending) return;

      // Create a virtual element where the user clicked
      refs.setReference({
        getBoundingClientRect: () => new DOMRect(e.clientX, e.clientY, 0, 0), // Position menu exactly at the click position
      });

      dispatch(
        draftSlice.actions.start({
          activity: "eventRightClick",
          eventType: event.isAllDay
            ? Categories_Event.ALLDAY
            : Categories_Event.TIMED,
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
    <div
      id={id}
      style={{ display: "contents" }}
      onContextMenu={handleContextMenu}
    >
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
          onOutsideClick={handleDiscard}
        />
      )}
    </div>
  );
};
