import { FloatingPortal, useFloating } from "@floating-ui/react";
import { useQueryClient } from "@tanstack/react-query";
import type React from "react";
import { useMemo, useState } from "react";
import { getCalendarEventIdFromElement } from "@web/common/utils/event/event.util";
import {
  editGridEventDraft,
  gridEventDraftToGridEvent,
} from "@web/events/grid-event-draft.adapter";
import { findEventInCache } from "@web/events/queries/event.query.cache";
import {
  draftActions,
  selectGridDraft,
  useDraftStore,
} from "@web/events/stores/draft.store";
import { ContextMenu } from "./ContextMenu";
import {
  CONTEXT_MENU_FLOATING_OPTIONS,
  contextMenuStyle,
  cursorReference,
} from "./contextMenu.floating";

export const ContextMenuWrapper = ({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) => {
  const queryClient = useQueryClient();
  const gridDraft = useDraftStore(selectGridDraft);
  const contextMenuEvent = useMemo(
    () => (gridDraft ? gridEventDraftToGridEvent(gridDraft) : undefined),
    [gridDraft],
  );

  const [isOpen, setIsOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    ...CONTEXT_MENU_FLOATING_OPTIONS,
    open: isOpen,
    onOpenChange(newIsOpen, _, reason) {
      setIsOpen(newIsOpen);
      if (newIsOpen === false && reason === "escape-key") {
        handleDiscard();
      }
    },
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

      refs.setReference(cursorReference(e.clientX, e.clientY));

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
        <FloatingPortal>
          <ContextMenu
            ref={refs.setFloating}
            event={contextMenuEvent}
            style={contextMenuStyle(floatingStyles)}
            context={context}
            close={closeMenu}
            onOutsideClick={handleDiscard}
          />
        </FloatingPortal>
      )}
    </div>
  );
};
