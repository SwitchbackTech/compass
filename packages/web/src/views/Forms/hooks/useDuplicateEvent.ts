import { ObjectId } from "bson";
import { useCallback } from "react";
import { lastValueFrom, timer } from "rxjs";
import { getEntity } from "@ngneat/elf-entities";
import {
  CursorItem,
  openFloatingAtCursor,
} from "@web/common/hooks/useOpenAtCursor";
import { getCalendarEventElementFromGrid } from "@web/common/utils/event/event.util";
import { eventsStore, setDraft } from "@web/store/events";
import { useCloseEventForm } from "@web/views/Forms/hooks/useCloseEventForm";

/**
 * useDuplicateEvent
 *
 * **important** use within Day View for now
 */
export function useDuplicateEvent(_id: string) {
  const onClose = useCloseEventForm();

  const duplicateEvent = useCallback(() => {
    const event = eventsStore.query(getEntity(_id));

    if (!event) return;

    onClose();

    lastValueFrom(timer(10)).then(() => {
      const newId = new ObjectId().toString();

      setDraft({ ...event, _id: newId });

      lastValueFrom(timer(10)).then(() => {
        const reference = getCalendarEventElementFromGrid(newId);

        if (!reference) return;

        openFloatingAtCursor({ nodeId: CursorItem.EventForm, reference });
      });
    });
  }, [_id, onClose]);

  return duplicateEvent;
}
