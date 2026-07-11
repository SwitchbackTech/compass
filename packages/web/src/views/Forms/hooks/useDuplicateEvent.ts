import { ObjectId } from "bson";
import { useCallback } from "react";
import { eventToSchemaEvent } from "@web/events/queries/event.legacy-bridge";
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

    onClose();

    const newId = new ObjectId().toString();
    // TODO(packet-03-phase-3c): draft.store.ts still holds the legacy
    // Schema_Event shape; bridge until it's converted to `Event`.
    const duplicate = { ...eventToSchemaEvent(event), _id: newId };

    // The duplicated draft renders into the grid and its card attaches the
    // floating reference, so the form anchors itself once mounted.
    draftActions.startGridClick(duplicate);
    draftActions.setFormOpen(true);
  }, [event, onClose]);

  return duplicateEvent;
}
