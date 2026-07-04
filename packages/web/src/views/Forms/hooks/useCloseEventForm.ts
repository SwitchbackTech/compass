import { useCallback } from "react";
import { draftActions } from "@web/events/stores/draft.store";

export function useCloseEventForm() {
  return useCallback(() => {
    draftActions.discard();
  }, []);
}
