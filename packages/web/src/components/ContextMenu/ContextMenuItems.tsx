import { Copy, PenNib, Trash } from "@phosphor-icons/react";
import type React from "react";
import {
  isEventReadOnly,
  useCalendarLookup,
} from "@web/calendars/useCalendarLookup";
import { ID_CONTEXT_MENU_ITEMS } from "@web/common/constants/web.constants";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { selectGridDraft, useDraftStore } from "@web/events/stores/draft.store";
import { useDraftContext } from "@web/views/Week/components/Draft/context/useDraftContext";

export interface ContextMenuAction {
  id: string;
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
}

export interface ContextMenuItemsActions {
  delete: () => void;
  duplicate: () => void;
  edit: () => void;
}

interface ContextMenuItemsProps {
  event: Schema_GridEvent;
  close: () => void;
}

interface ContextMenuItemsViewProps extends ContextMenuItemsProps {
  actions: ContextMenuItemsActions;
}

export function ContextMenuItemsView({
  actions,
  close,
  event,
}: ContextMenuItemsViewProps) {
  const calendarLookup = useCalendarLookup();
  // Read-only (unwritable calendar or busy content) events can be inspected
  // ("View" below opens the read-only form) but never mutated - Delete is
  // hidden entirely rather than merely disabled, since there's nothing
  // useful to click through to (packet 08 step 8).
  const isReadOnly = isEventReadOnly(
    calendarLookup,
    event.calendarId,
    event.isBusy ?? false,
  );

  const menuActions: ContextMenuAction[] = [
    {
      id: "edit",
      label: isReadOnly ? "View" : "Edit",
      onClick: actions.edit,
      icon: <PenNib aria-hidden="true" size={20} />,
    },
    {
      id: "duplicate",
      label: "Duplicate",
      onClick: actions.duplicate,
      icon: <Copy aria-hidden="true" size={20} />,
    },
    ...(isReadOnly
      ? []
      : [
          {
            id: "delete",
            label: "Delete",
            onClick: actions.delete,
            icon: <Trash aria-hidden="true" size={20} />,
          },
        ]),
  ];

  return (
    <div id={ID_CONTEXT_MENU_ITEMS}>
      {menuActions.map((item) => (
        <button
          className="c-context-menu-item"
          key={item.id}
          type="button"
          onClick={() => {
            item.onClick();
            close();
          }}
        >
          {item.icon}
          <span className="text-l">{item.label}</span>
        </button>
      ))}
    </div>
  );
}

export function ContextMenuItems({ event, close }: ContextMenuItemsProps) {
  const { actions, setters, confirmation } = useDraftContext();
  const { openForm, duplicateEvent } = actions;
  const { setDraft } = setters;
  // The right-click flow (GridContextMenuWrapper.tsx) already builds a
  // GridEventDraft via editGridEventDraft and pushes it into the store, so
  // this reads that canonical draft rather than re-deriving one from
  // `event` (a Schema_GridEvent render projection with no strict source).
  const gridDraft = useDraftStore(selectGridDraft);

  const menuActions: ContextMenuItemsActions = {
    delete: confirmation.onDelete,
    duplicate: duplicateEvent,
    edit: () => {
      if (gridDraft) setDraft(gridDraft);
      openForm();
    },
  };

  return (
    <ContextMenuItemsView actions={menuActions} close={close} event={event} />
  );
}
