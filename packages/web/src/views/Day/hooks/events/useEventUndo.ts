import { useCallback, useState } from "react";
import { toast } from "react-toastify";
import { Schema_Event } from "@core/types/event.types";
import { createEventSlice } from "@web/ducks/events/slices/event.slice";
import { useAppDispatch } from "@web/store/store.hooks";
import { showUndoDeleteToast } from "@web/views/Day/components/Toasts/UndoToast/UndoDeleteToast";

type EventUndoState = {
  event: Schema_Event;
  deletedAt: Date;
} | null;

interface UseEventUndoReturn {
  undoState: EventUndoState;
  undoToastId: string | number | null;
  deleteEvent: (event: Schema_Event) => void;
  restoreEvent: () => void;
  clearUndoState: () => void;
}

/**
 * Hook to manage event undo functionality
 * Similar to task undo pattern, stores deleted event and provides restore capability
 */
export function useEventUndo(): UseEventUndoReturn {
  const dispatch = useAppDispatch();
  const [undoState, setUndoState] = useState<EventUndoState>(null);
  const [undoToastId, setUndoToastId] = useState<string | number | null>(null);

  const restoreEvent = useCallback(() => {
    if (!undoState) return;

    // Restore the event by creating it again
    // Remove _id so it gets a new ID (since the original was deleted from backend)
    const { _id, ...eventWithoutId } = undoState.event;
    dispatch(
      createEventSlice.actions.request({
        ...eventWithoutId,
        recurrence: undoState.event.recurrence as never,
      }),
    );

    // Clear undo state
    setUndoState(null);
    if (undoToastId) {
      toast.dismiss(undoToastId);
      setUndoToastId(null);
    }
  }, [dispatch, undoState, undoToastId]);
  const deleteEvent = useCallback(
    (event: Schema_Event) => {
      // Store event for undo before deletion
      setUndoState({
        event,
        deletedAt: new Date(),
      });

      // Show undo toast
      const toastId = showUndoDeleteToast(() => {
        restoreEvent();
      });
      setUndoToastId(toastId);
    },
    [restoreEvent],
  );

  const clearUndoState = useCallback(() => {
    setUndoState(null);
    if (undoToastId) {
      toast.dismiss(undoToastId);
      setUndoToastId(null);
    }
  }, [undoToastId]);

  return {
    undoState,
    undoToastId,
    deleteEvent,
    restoreEvent,
    clearUndoState,
  };
}
