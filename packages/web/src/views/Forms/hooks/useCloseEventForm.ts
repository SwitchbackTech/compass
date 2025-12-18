import { useCallback } from "react";
import { closeFloatingAtCursor } from "@web/common/hooks/useOpenAtCursor";
import { setDraft } from "@web/views/Calendar/components/Draft/context/useDraft";

export function useCloseEventForm() {
  const closeEventForm = useCallback(() => {
    closeFloatingAtCursor();
    setDraft(null);
  }, []);

  return closeEventForm;
}
