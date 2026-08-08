import { useCallback } from "react";
import { focusCalendarEventElement } from "@web/common/utils/event/event.util";
import {
  draftActions,
  selectDraftId,
  useDraftStore,
} from "@web/events/stores/draft.store";

export function useCloseEventForm() {
  return useCallback(() => {
    const eventId = selectDraftId(useDraftStore.getState());
    draftActions.discard();
    if (eventId) {
      focusCalendarEventElement(eventId);
    }
  }, []);
}
