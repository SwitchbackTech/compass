import { useCallback } from "react";
import { closeFloatingAtCursor } from "@web/common/hooks/useOpenAtCursor";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { useAppDispatch } from "@web/store/store.hooks";

export function useCloseEventForm() {
  const dispatch = useAppDispatch();

  const closeEventForm = useCallback(() => {
    dispatch(draftSlice.actions.discard(undefined));
    closeFloatingAtCursor();
  }, [dispatch]);

  return closeEventForm;
}
