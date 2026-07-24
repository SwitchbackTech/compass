import { Copy, PenNib, Trash } from "@phosphor-icons/react";
import type React from "react";
import { createContext, useContext } from "react";
import {
  isEventReadOnly,
  useCalendarLookup,
} from "@web/calendars/useCalendarLookup";
import { ID_CONTEXT_MENU_ITEMS } from "@web/common/constants/web.constants";
import { type GridEvent } from "@web/common/types/web.event.types";
import { selectGridDraft, useDraftStore } from "@web/events/stores/draft.store";
import { useDeleteEvent } from "@web/views/Forms/hooks/useDeleteEvent";
import { useDuplicateEvent } from "@web/views/Forms/hooks/useDuplicateEvent";
import { useDraftContext } from "@web/views/Week/components/Draft/context/useDraftContext";

export interface ContextMenuAction {
  id: string;
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
}

// Supplied by ContextMenu so each item can wire into floating-ui's roving-focus
// list navigation (arrow keys) and register its node in the shared listRef. The
// menu still renders standalone (e.g. in tests) without a provider, in which
// case items fall back to plain roving-free buttons.
interface ContextMenuNavContextValue {
  getItemProps: (
    userProps?: React.HTMLProps<HTMLElement>,
  ) => Record<string, unknown>;
  listRef: React.MutableRefObject<Array<HTMLElement | null>>;
  activeIndex: number | null;
}

export const ContextMenuNavContext =
  createContext<ContextMenuNavContextValue | null>(null);

export interface ContextMenuItemsActions {
  delete: () => void;
  duplicate: () => void;
  edit: () => void;
}

interface ContextMenuItemsProps {
  event: GridEvent;
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

  const nav = useContext(ContextMenuNavContext);

  return (
    // role="none" keeps the menu -> menuitem ownership valid across this
    // container (the id is also how isContextMenuOpen() detects the menu).
    <div id={ID_CONTEXT_MENU_ITEMS} role="none">
      {menuActions.map((item, index) => {
        const select = () => {
          item.onClick();
          close();
        };
        const itemProps = nav
          ? nav.getItemProps({ onClick: select })
          : { onClick: select };
        return (
          <button
            className="c-context-menu-item"
            key={item.id}
            type="button"
            role="menuitem"
            ref={(node) => {
              if (nav) nav.listRef.current[index] = node;
            }}
            tabIndex={nav ? (nav.activeIndex === index ? 0 : -1) : undefined}
            {...itemProps}
          >
            {item.icon}
            <span className="text-l">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function ContextMenuItems({ event, close }: ContextMenuItemsProps) {
  const { actions, setters } = useDraftContext();
  const { openForm } = actions;
  const { setDraft } = setters;
  const eventId = event._id ?? "";
  const deleteEvent = useDeleteEvent(eventId);
  const duplicateEvent = useDuplicateEvent(eventId);
  // The right-click flow (GridContextMenuWrapper.tsx) already builds a
  // GridEventDraft via editGridEventDraft and pushes it into the store, so
  // this reads that canonical draft rather than re-deriving one from
  // `event` (a GridEvent render projection with no strict source).
  const gridDraft = useDraftStore(selectGridDraft);

  const menuActions: ContextMenuItemsActions = {
    delete: () => {
      deleteEvent();
    },
    duplicate: () => {
      duplicateEvent();
    },
    edit: () => {
      if (gridDraft) setDraft(gridDraft);
      openForm();
    },
  };

  return (
    <ContextMenuItemsView actions={menuActions} close={close} event={event} />
  );
}
