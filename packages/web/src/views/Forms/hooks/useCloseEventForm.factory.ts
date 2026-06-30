import { useCallback } from "react";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";

type CloseEventFormDependencies = {
  useAppDispatch: () => (action: unknown) => unknown;
};

export function createUseCloseEventForm({
  useAppDispatch,
}: CloseEventFormDependencies) {
  return function useCloseEventForm() {
    const dispatch = useAppDispatch();

    const closeEventForm = useCallback(() => {
      dispatch(draftSlice.actions.discard(undefined));
    }, [dispatch]);

    return closeEventForm;
  };
}
