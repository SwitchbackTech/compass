import React, { useCallback } from "react";
import { TrashIcon } from "@phosphor-icons/react";
import { useDeleteEvent } from "@web/views/Forms/hooks/useDeleteEvent";

export function EventContextMenuItems({ id }: { id: string }) {
  const deleteEvent = useDeleteEvent(id);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        deleteEvent();
      }
    },
    [deleteEvent],
  );

  return (
    <li
      onClick={() => deleteEvent()}
      onKeyDown={handleKeyDown}
      role="menuitem"
      tabIndex={0}
      className="flex cursor-pointer items-center gap-2 border-b border-gray-600 px-3 py-2.5 text-sm text-gray-200 last:border-b-0 hover:bg-gray-700"
    >
      <TrashIcon size={16} className="text-gray-300" />
      <span>Delete Event</span>
    </li>
  );
}
