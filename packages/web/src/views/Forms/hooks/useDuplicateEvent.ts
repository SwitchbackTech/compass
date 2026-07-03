import { ObjectId } from "bson";
import { useCallback } from "react";
import { useEventById } from "@web/ducks/events/queries/useEventById";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { useAppDispatch } from "@web/store/store.hooks";
import { useCloseEventForm } from "@web/views/Forms/hooks/useCloseEventForm";

/**
 * useDuplicateEvent
 *
 * **important** use within Day View for now
 */
export function useDuplicateEvent(_id: string) {
  const dispatch = useAppDispatch();
  const event = useEventById(_id);
  const onClose = useCloseEventForm();

  const duplicateEvent = useCallback(() => {
    if (!event) return;

    onClose();

    const newId = new ObjectId().toString();
    const duplicate = { ...event, _id: newId };

    // The duplicated draft renders into the grid and its card attaches the
    // floating reference, so the form anchors itself once mounted.
    dispatch(draftSlice.actions.startGridClick(duplicate));
    dispatch(draftSlice.actions.setFormOpen(true));
  }, [dispatch, event, onClose]);

  return duplicateEvent;
}
