import { useCallback, useRef, useState } from "react";
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

  // Use refs to access latest values in callbacks
  const undoStateRef = useRef<EventUndoState>(null);
  const undoToastIdRef = useRef<string | number | null>(null);

  // Keep refs in sync with state
  undoStateRef.current = undoState;
  undoToastIdRef.current = undoToastId;

  const restoreEvent = useCallback(() => {
    const currentUndoState = undoStateRef.current;
    const currentToastId = undoToastIdRef.current;

    if (!currentUndoState) return;

    // Restore the event by creating it again
    // Remove _id so it gets a new ID (since the original was deleted from backend)
    const { _id, ...eventWithoutId } = currentUndoState.event;
    dispatch(
      createEventSlice.actions.request({
        ...eventWithoutId,
        recurrence: currentUndoState.event.recurrence as never,
      }),
    );

    // Clear undo state
    setUndoState(null);
    if (currentToastId) {
      toast.dismiss(currentToastId);
      setUndoToastId(null);
    }
  }, [dispatch]);

  const deleteEvent = useCallback(
    (event: Schema_Event) => {
      // Store event for undo before deletion
      const newUndoState = {
        event,
        deletedAt: new Date(),
      };
      setUndoState(newUndoState);
      undoStateRef.current = newUndoState;

      // Show undo toast with a stable callback that reads from refs
      const toastId = showUndoDeleteToast(() => {
        restoreEvent();
      });
      setUndoToastId(toastId);
      undoToastIdRef.current = toastId;
    },
    [restoreEvent],
  );

  const clearUndoState = useCallback(() => {
    const currentToastId = undoToastIdRef.current;
    setUndoState(null);
    undoStateRef.current = null;
    if (currentToastId) {
      toast.dismiss(currentToastId);
      setUndoToastId(null);
      undoToastIdRef.current = null;
    }
  }, []);

  return {
    undoState,
    undoToastId,
    deleteEvent,
    restoreEvent,
    clearUndoState,
  };
}
