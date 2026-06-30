import { ObjectId } from "bson";
import { useCallback } from "react";
import { selectEventById } from "@web/ducks/events/selectors/event.selectors";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";

/**
 * useDuplicateEvent
 *
 * **important** use within Day View for now
 */
export function useDuplicateEvent(_id: string, onDuplicate?: () => void) {
  const dispatch = useAppDispatch();
  const event = useAppSelector((state) =>
    _id ? selectEventById(state, _id) : null,
  );
  const duplicateEvent = useCallback(() => {
    if (!event) return;

    const newId = new ObjectId().toString();
    const duplicate = { ...event, _id: newId };

    dispatch(draftSlice.actions.startGridClick(duplicate));
    onDuplicate?.();
  }, [dispatch, event, onDuplicate]);

  return duplicateEvent;
}
