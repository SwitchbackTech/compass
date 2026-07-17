import {
  autoUpdate,
  FloatingPortal,
  flip,
  offset,
  shift,
  useFloating,
} from "@floating-ui/react";
import { useQueryClient } from "@tanstack/react-query";
import type React from "react";
import { useState } from "react";
import { Z_INDEX_FLOATING_MENU } from "@web/common/constants/web.constants";
import {
  assembleGridEvent,
  getCalendarEventIdFromElement,
  hasEventDates,
} from "@web/common/utils/event/event.util";
import { editGridEventDraft } from "@web/events/grid-event-draft.adapter";
import { findEventInCache } from "@web/events/queries/event.query.cache";
import {
  draftActions,
  selectDraft,
  useDraftStore,
} from "@web/events/stores/draft.store";
import { ContextMenu } from "./ContextMenu";

export const ContextMenuWrapper = ({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) => {
  const queryClient = useQueryClient();

  const draftEvent = useDraftStore(selectDraft);

  const [isOpen, setIsOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    placement: "right-start",
    middleware: [offset(5), flip(), shift()],
    open: isOpen,
    onOpenChange(newIsOpen, _, reason) {
      setIsOpen(newIsOpen);
      if (newIsOpen === false && reason === "escape-key") {
        handleDiscard();
      }
    },
    // The reference is a virtual element at the click's viewport coordinates,
    // and the menu is portalled out of the scrolling grid, so anchor it to
    // the viewport rather than an offset parent.
    strategy: "fixed",
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
    draftActions.discard();
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

      const draft = editGridEventDraft(getSelectedEvent(eventId));
      if (!draft) return;

      // Create a virtual element where the user clicked
      refs.setReference({
        getBoundingClientRect: () => new DOMRect(e.clientX, e.clientY, 0, 0), // Position menu exactly at the click position
      });

      draftActions.startGridDraft({ activity: "eventRightClick", draft });

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
        // Portalled: rendered inline it shared a stacking context with the
        // event cards and lost to any card stacked above it.
        <FloatingPortal>
          <ContextMenu
            ref={refs.setFloating}
            event={
              draftEvent && hasEventDates(draftEvent)
                ? assembleGridEvent(draftEvent)
                : undefined
            }
            style={{ ...floatingStyles, zIndex: Z_INDEX_FLOATING_MENU }}
            context={context}
            close={closeMenu}
            onOutsideClick={handleDiscard}
          />
        </FloatingPortal>
      )}
    </div>
  );
};
