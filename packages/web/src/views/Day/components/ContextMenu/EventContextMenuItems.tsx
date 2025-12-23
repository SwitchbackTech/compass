import React, { useCallback } from "react";
import { useObservable } from "@ngneat/use-observable";
import { TrashIcon } from "@phosphor-icons/react";
import { RecurringEventUpdateScope } from "@core/types/event.types";
import { closeFloatingAtCursor } from "@web/common/hooks/useOpenAtCursor";
import { deleteEventSlice } from "@web/ducks/events/slices/event.slice";
import { activeEvent$ } from "@web/store/events";
import { useAppDispatch } from "@web/store/store.hooks";

export function EventContextMenuItems() {
  const [activeEvent] = useObservable(activeEvent$);
  const dispatch = useAppDispatch();

  const handleDelete = useCallback(() => {
    if (!activeEvent?._id) return;

    // Dispatch delete action
    dispatch(
      deleteEventSlice.actions.request({
        _id: activeEvent?._id,
        applyTo: RecurringEventUpdateScope.THIS_EVENT,
      }),
    );

    closeFloatingAtCursor();
  }, [dispatch, activeEvent?._id]);

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
