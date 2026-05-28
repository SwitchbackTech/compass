import {
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { type Priorities } from "@core/constants/core.constants";
import { type useFloatingAtCursor } from "@web/common/hooks/useFloatingAtCursor";
import {
  CursorItem,
  closeFloatingAtCursor,
  openFloatingAtCursor,
  useFloatingNodeIdAtCursor,
  useFloatingOpenAtCursor,
} from "@web/common/hooks/useOpenAtCursor";
import { useUpdateEvent } from "@web/common/hooks/useUpdateEvent";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { getCalendarEventIdFromElement } from "@web/common/utils/event/event.util";
import { ContextMenu } from "@web/components/ContextMenu/ContextMenu";
import { type ContextMenuItemsActions } from "@web/components/ContextMenu/ContextMenuItems";
import { selectPendingEventIds } from "@web/ducks/events/selectors/pending.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { useDeleteEvent } from "@web/views/Forms/hooks/useDeleteEvent";
import { useDuplicateEvent } from "@web/views/Forms/hooks/useDuplicateEvent";

type DayCalendarFloating = ReturnType<typeof useFloatingAtCursor>;

export const useDayCalendarContextMenu = ({
  floating,
  getDayEventById,
  onOpenEvent,
}: {
  floating: DayCalendarFloating;
  getDayEventById: (eventId: string) => Schema_GridEvent | null;
  onOpenEvent: (event: Schema_GridEvent) => void;
}) => {
  const pendingEventIds = useAppSelector(selectPendingEventIds);
  const contextMenuAnchorRef = useRef<HTMLDivElement | null>(null);
  const [contextMenuEvent, setContextMenuEvent] =
    useState<Schema_GridEvent | null>(null);
  const contextMenuEventId = contextMenuEvent?._id ?? "";
  const duplicateContextMenuEvent = useDuplicateEvent(contextMenuEventId);
  const deleteContextMenuEvent = useDeleteEvent(contextMenuEventId);
  const updateEvent = useUpdateEvent();
  const isFloatingOpen = useFloatingOpenAtCursor();
  const floatingNodeId = useFloatingNodeIdAtCursor();

  const closeContextMenu = useCallback(() => {
    setContextMenuEvent(null);
    closeFloatingAtCursor();
  }, []);

  const handleContextMenu = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      const target = event.target;

      if (!(target instanceof HTMLElement)) {
        return;
      }

      const eventId = getCalendarEventIdFromElement(target);

      if (!eventId) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (pendingEventIds.includes(eventId)) {
        return;
      }

      const selectedEvent = getDayEventById(eventId);
      const anchor = contextMenuAnchorRef.current;

      if (!selectedEvent || !anchor) {
        return;
      }

      anchor.style.left = `${event.clientX}px`;
      anchor.style.top = `${event.clientY}px`;
      setContextMenuEvent(selectedEvent);
      openFloatingAtCursor({
        nodeId: CursorItem.EventContextMenu,
        reference: anchor,
      });
    },
    [getDayEventById, pendingEventIds],
  );

  const contextMenuActions = useMemo<ContextMenuItemsActions>(
    () => ({
      delete: () => {
        deleteContextMenuEvent();
      },
      duplicate: () => {
        duplicateContextMenuEvent();
      },
      edit: () => {
        if (!contextMenuEvent) {
          return;
        }

        onOpenEvent(contextMenuEvent);
      },
      editPriority: (priority: Priorities) => {
        if (!contextMenuEvent) {
          return;
        }

        updateEvent({ event: { ...contextMenuEvent, priority } }, true);
      },
    }),
    [
      contextMenuEvent,
      deleteContextMenuEvent,
      duplicateContextMenuEvent,
      onOpenEvent,
      updateEvent,
    ],
  );

  const isContextMenuOpen =
    isFloatingOpen && floatingNodeId === CursorItem.EventContextMenu;

  return {
    anchorElement: (
      <div
        aria-hidden="true"
        ref={contextMenuAnchorRef}
        style={{
          height: 0,
          left: 0,
          pointerEvents: "none",
          position: "fixed",
          top: 0,
          width: 0,
        }}
      />
    ),
    contextMenu: isContextMenuOpen ? (
      <ContextMenu
        actions={contextMenuActions}
        close={closeContextMenu}
        context={floating.context}
        event={contextMenuEvent ?? undefined}
        isPending={Boolean(
          contextMenuEvent?._id &&
            pendingEventIds.includes(contextMenuEvent._id),
        )}
        onOutsideClick={closeContextMenu}
        ref={floating.refs.setFloating}
        style={floating.context.floatingStyles}
      />
    ) : null,
    handleContextMenu,
  };
};
