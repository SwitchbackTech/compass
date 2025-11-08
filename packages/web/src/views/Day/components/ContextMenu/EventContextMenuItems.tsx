import React from "react";
import { useDispatch } from "react-redux";
import { Trash } from "@phosphor-icons/react";
import { RecurringEventUpdateScope } from "@core/types/event.types";
import { Schema_Event } from "@core/types/event.types";
import { deleteEventSlice } from "@web/ducks/events/slices/event.slice";
import { useEventContextMenu } from "./EventContextMenuContext";

interface EventContextMenuItemsProps {
  event: Schema_Event;
  close: () => void;
}

export function EventContextMenuItems({
  event,
  close,
}: EventContextMenuItemsProps) {
  const dispatch = useDispatch();
  const { onDelete } = useEventContextMenu();

  const handleDelete = () => {
    if (!event._id) return;

    // If onDelete callback is provided (for undo support), use it
    if (onDelete) {
      onDelete(event);
    }

    // Dispatch delete action
    dispatch(
      deleteEventSlice.actions.request({
        _id: event._id,
        applyTo: RecurringEventUpdateScope.THIS_EVENT,
      } as unknown as void),
    );
    close();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleDelete();
    }
  };

  return (
    <li
      onClick={handleDelete}
      onKeyDown={handleKeyDown}
      role="menuitem"
      tabIndex={0}
      className="flex cursor-pointer items-center gap-2 border-b border-gray-600 px-3 py-2.5 text-sm text-gray-200 last:border-b-0 hover:bg-gray-700"
    >
      <Trash size={16} className="text-gray-300" />
      <span>Delete Event</span>
    </li>
  );
}
