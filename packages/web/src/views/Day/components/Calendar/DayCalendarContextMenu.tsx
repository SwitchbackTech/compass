import {
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
} from "@floating-ui/react";
import {
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useMemo,
  useState,
} from "react";
import { type Priorities } from "@core/constants/core.constants";
import { useUpdateEvent } from "@web/common/hooks/useUpdateEvent";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { getCalendarEventIdFromElement } from "@web/common/utils/event/event.util";
import { ContextMenu } from "@web/components/ContextMenu/ContextMenu";
import { type ContextMenuItemsActions } from "@web/components/ContextMenu/ContextMenuItems";
import { selectPendingEventIds } from "@web/ducks/events/selectors/pending.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { useDeleteEvent } from "@web/views/Forms/hooks/useDeleteEvent";
import { useDuplicateEvent } from "@web/views/Forms/hooks/useDuplicateEvent";

export const useDayCalendarContextMenu = ({
  getDayEventById,
  onCloseEventForm,
  onOpenEvent,
  onOpenForm,
}: {
  getDayEventById: (eventId: string) => Schema_GridEvent | null;
  onCloseEventForm: () => void;
  onOpenEvent: (event: Schema_GridEvent) => void;
  onOpenForm: () => void;
}) => {
  const pendingEventIds = useAppSelector(selectPendingEventIds);
  const [contextMenuEvent, setContextMenuEvent] =
    useState<Schema_GridEvent | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const floating = useFloating({
    middleware: [offset(5), flip(), shift()],
    onOpenChange: setIsOpen,
    open: isOpen,
    placement: "right-start",
    strategy: "fixed",
    whileElementsMounted: autoUpdate,
  });
  const contextMenuEventId = contextMenuEvent?._id ?? "";
  const duplicateContextMenuEvent = useDuplicateEvent(
    contextMenuEventId,
    onOpenForm,
  );
  const deleteContextMenuEvent = useDeleteEvent(contextMenuEventId);
  const updateEvent = useUpdateEvent();

  const closeContextMenu = useCallback(() => {
    setContextMenuEvent(null);
    setIsOpen(false);
  }, []);

  const handleContextMenu = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      const target = event.target;

      if (!(target instanceof HTMLElement)) return;

      const eventId = getCalendarEventIdFromElement(target);
      if (!eventId) return;

      event.preventDefault();
      event.stopPropagation();

      if (pendingEventIds.includes(eventId)) return;

      const selectedEvent = getDayEventById(eventId);
      if (!selectedEvent) return;

      onCloseEventForm();
      floating.refs.setPositionReference({
        contextElement: target,
        getBoundingClientRect: () =>
          new DOMRect(event.clientX, event.clientY, 0, 0),
      });
      setContextMenuEvent(selectedEvent);
      setIsOpen(true);
    },
    [floating.refs, getDayEventById, onCloseEventForm, pendingEventIds],
  );

  const contextMenuActions = useMemo<ContextMenuItemsActions>(
    () => ({
      delete: deleteContextMenuEvent,
      duplicate: duplicateContextMenuEvent,
      edit: () => {
        if (contextMenuEvent) onOpenEvent(contextMenuEvent);
      },
      editPriority: (priority: Priorities) => {
        if (contextMenuEvent) {
          updateEvent({ event: { ...contextMenuEvent, priority } }, true);
        }
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

  return {
    contextMenu: isOpen ? (
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
        style={floating.floatingStyles}
      />
    ) : null,
    handleContextMenu,
  };
};
