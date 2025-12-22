import { useCallback } from "react";
import { closeFloatingAtCursor } from "@web/common/hooks/useOpenAtCursor";
import { resetActiveEvent, resetDraft } from "@web/store/events";

export function useCloseEventForm() {
  const closeEventForm = useCallback(() => {
    resetDraft();
    resetActiveEvent();
    closeFloatingAtCursor();
  }, []);

  return closeEventForm;
}
