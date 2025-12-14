import React, { useCallback } from "react";
import { useDispatch } from "react-redux";
import { TrashIcon } from "@phosphor-icons/react";
import { RecurringEventUpdateScope } from "@core/types/event.types";
import { deleteEventSlice } from "@web/ducks/events/slices/event.slice";
import { useDraftContextV2 } from "@web/views/Calendar/components/Draft/context/useDraftContextV2";

export function EventContextMenuItems() {
  const { draft, closeOpenAtCursor } = useDraftContextV2();
  const dispatch = useDispatch();

  const handleDelete = useCallback(() => {
    if (!draft?._id) return;

    // Dispatch delete action
    dispatch(
      deleteEventSlice.actions.request({
        _id: draft?._id,
        applyTo: RecurringEventUpdateScope.THIS_EVENT,
      }),
    );

    closeOpenAtCursor();
  }, [dispatch, draft?._id, closeOpenAtCursor]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleDelete();
      }
    },
    [handleDelete],
  );

  return (
    <li
      onClick={handleDelete}
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
