import { useCallback } from "react";
import {
  RecurringEventUpdateScope,
  type Schema_Event,
} from "@core/types/event.types";
import { useEventMutations } from "@web/events/mutations/useEventMutations";
import { useEventById } from "@web/events/queries/useEventById";
import { draftActions } from "@web/events/stores/draft.store";

// No confirmation prompt: deletes are undoable via Cmd/Ctrl+Z (the mutation
// layer records a snapshot and shows a "Deleted" toast with the undo hint).
export function deleteEventAndDiscardDraft(
  deleteEvent?: (payload: {
    _id: string;
    applyTo: RecurringEventUpdateScope;
  }) => void,
  existingEvent?: Schema_Event | null,
) {
  if (existingEvent?._id) {
    deleteEvent?.({
      _id: existingEvent._id,
      applyTo: RecurringEventUpdateScope.THIS_EVENT,
    });
  }

  draftActions.discard();
}

/**
 * useDeleteEvent
 *
 * **important** use within Day View for now
 */
export function useDeleteEvent(_id: string) {
  const existingEvent = useEventById(_id);
  const { delete: deleteEventMutation } = useEventMutations();

  const deleteEvent = useCallback(
    (
      applyTo: RecurringEventUpdateScope = RecurringEventUpdateScope.THIS_EVENT,
    ) => {
      if (!existingEvent?._id) return;
      deleteEventMutation({ _id: existingEvent._id, applyTo });
      draftActions.discard();
    },
    [deleteEventMutation, existingEvent],
  );

  return deleteEvent;
}
