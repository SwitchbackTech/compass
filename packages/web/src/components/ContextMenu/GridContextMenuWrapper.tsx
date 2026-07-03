import {
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
} from "@floating-ui/react";
import { useQueryClient } from "@tanstack/react-query";
import type React from "react";
import { useState } from "react";
import { Categories_Event } from "@core/types/event.types";
import {
  assembleGridEvent,
  getCalendarEventIdFromElement,
  hasEventDates,
} from "@web/common/utils/event/event.util";
import { usePendingEventIds } from "@web/ducks/events/mutations/useEventPending";
import { findEventInCache } from "@web/ducks/events/queries/event.query.cache";
import { selectDraft } from "@web/ducks/events/selectors/draft.selectors";
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
  const queryClient = useQueryClient();
  const pendingEventIds = usePendingEventIds();

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
    const selectedEvent = findEventInCache(queryClient, eventId);

    if (!selectedEvent) {
      throw new Error("Selected event not found");
    }

    return selectedEvent;
  };

  const handleDiscard = () => {
    closeMenu();
    dispatch(draftSlice.actions.discard(undefined));
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
    // biome-ignore lint/a11y/noStaticElementInteractions: The display-contents wrapper only forwards right-clicks from its children.
    <div
      id={id}
      style={{ display: "contents" }}
      onContextMenu={handleContextMenu}
    >
      {children}
      {isOpen && (
        <ContextMenu
          ref={refs.setFloating}
          event={
            draftEvent && hasEventDates(draftEvent)
              ? assembleGridEvent(draftEvent)
              : undefined
          }
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
