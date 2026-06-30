import { ObjectId } from "bson";
import { useCallback } from "react";
import {
  CursorItem,
  openFloatingAtCursor,
} from "@web/common/hooks/useOpenAtCursor";
import { getCalendarEventElementFromGrid } from "@web/common/utils/event/event.util";
import { selectEventById } from "@web/ducks/events/selectors/event.selectors";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { useCloseEventForm } from "@web/views/Forms/hooks/useCloseEventForm";

/**
 * useDuplicateEvent
 *
 * **important** use within Day View for now
 */
export function useDuplicateEvent(_id: string) {
  const dispatch = useAppDispatch();
  const event = useAppSelector((state) =>
    _id ? selectEventById(state, _id) : null,
  );
  const onClose = useCloseEventForm();

  const duplicateEvent = useCallback(() => {
    if (!event) return;

    onClose();

    const newId = new ObjectId().toString();
    const duplicate = { ...event, _id: newId };

    dispatch(draftSlice.actions.startGridClick(duplicate));

    // Wait for the new draft to render into the grid before anchoring the
    // form to its element. A microtask runs after React flushes the dispatch
    // above, so the element exists without an arbitrary timeout.
    queueMicrotask(() => {
      const reference = getCalendarEventElementFromGrid(newId);

      if (!reference) return;

      openFloatingAtCursor({ nodeId: CursorItem.EventForm, reference });
    });
  }, [dispatch, event, onClose]);

  return duplicateEvent;
}
