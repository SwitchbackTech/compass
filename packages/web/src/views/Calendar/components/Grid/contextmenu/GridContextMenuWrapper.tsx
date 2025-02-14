import React from "react";
import { useState } from "react";
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
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { ContextMenu } from "./ContextMenu";

const GridContextMenuWrapper = ({
  children,
  weekProps,
}: {
  children: React.ReactNode;
  weekProps: WeekProps;
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

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const eventId = getCalendarEventIdFromElement(target);
    const hasClickedOnEvent = !!eventId;

    if (hasClickedOnEvent) {
      e.preventDefault();

      const selectedEvent =
        timedEvents.find((ev) => ev._id === eventId) ||
        allDayEvents.find((ev) => ev._id === eventId);

      if (!selectedEvent) {
        throw new Error("Selected event not found");
      }

      if (isOptimisticEvent(selectedEvent)) return;

      // Create a virtual element where the user clicked
      refs.setReference({
        getBoundingClientRect: () => new DOMRect(e.clientX, e.clientY, 0, 0), // Position menu exactly at the click position
      });
      dispatch(
        draftSlice.actions.start({
          event: {
            ...selectedEvent,
            isOpen: false,
          },
        })
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
      {isOpen && draftEvent && (
        <ContextMenu
          weekProps={weekProps}
          ref={refs.setFloating}
          event={assembleGridEvent(draftEvent)}
          style={{
            position: "absolute",
            top: `${y}px`,
            left: `${x}px`,
          }}
          context={context}
          onOutsideClick={() => {
            closeMenu();
            dispatch(draftSlice.actions.discard());
          }}
          onMenuItemClick={() => {
            closeMenu();
          }}
        />
      )}
    </div>
  );
};

export default GridContextMenuWrapper;
