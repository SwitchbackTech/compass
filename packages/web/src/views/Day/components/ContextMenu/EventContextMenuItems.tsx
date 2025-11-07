import { useDispatch } from "react-redux";
import { Trash } from "@phosphor-icons/react";
import { RecurringEventUpdateScope } from "@core/types/event.types";
import { Schema_Event } from "@core/types/event.types";
import { deleteEventSlice } from "@web/ducks/events/slices/event.slice";

interface EventContextMenuItemsProps {
  event: Schema_Event;
  close: () => void;
}

export function EventContextMenuItems({
  event,
  close,
}: EventContextMenuItemsProps) {
  const dispatch = useDispatch();

  const handleDelete = () => {
    dispatch(
      deleteEventSlice.actions.request({
        _id: event._id,
        applyTo: RecurringEventUpdateScope.THIS_EVENT,
      }),
    );
    close();
  };

  return (
    <li
      onClick={handleDelete}
      className="flex cursor-pointer items-center gap-2 border-b border-gray-600 px-3 py-2.5 text-sm text-gray-200 last:border-b-0 hover:bg-gray-700"
    >
      <Trash size={16} className="text-gray-300" />
      <span>Delete Event</span>
    </li>
  );
}
