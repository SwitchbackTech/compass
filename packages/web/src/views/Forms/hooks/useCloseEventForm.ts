import { closeFloatingAtCursor } from "@web/common/hooks/useOpenAtCursor";
import { resetActiveEvent, resetDraft } from "@web/store/events";
import { useCallback } from "react";

export function useCloseEventForm() {
  const closeEventForm = useCallback(() => {
    resetDraft();
    resetActiveEvent();
    closeFloatingAtCursor();
  }, []);

  return closeEventForm;
}
