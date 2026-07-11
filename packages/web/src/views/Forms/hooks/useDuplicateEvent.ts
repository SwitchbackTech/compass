import { useCallback } from "react";
import { duplicateGridEventDraft } from "@web/events/grid-event-draft.adapter";
import { useEventById } from "@web/events/queries/useEventById";
import { draftActions } from "@web/events/stores/draft.store";
import { useCloseEventForm } from "@web/views/Forms/hooks/useCloseEventForm";

/**
 * useDuplicateEvent
 *
 * **important** use within Day View for now
 */
export function useDuplicateEvent(_id: string) {
  const event = useEventById(_id);
  const onClose = useCloseEventForm();

  const duplicateEvent = useCallback(() => {
    if (!event) return;

    const duplicate = duplicateGridEventDraft(event);
    if (!duplicate) return;

    onClose();

    // The duplicated draft renders into the grid and its card attaches the
    // floating reference, so the form anchors itself once mounted.
    draftActions.startGridDraft({ activity: "gridClick", draft: duplicate });
    draftActions.setFormOpen(true);
  }, [event, onClose]);

  return duplicateEvent;
}
