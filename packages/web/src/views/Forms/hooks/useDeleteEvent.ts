import { useCallback } from "react";
import { getEntity } from "@ngneat/elf-entities";
import { RecurringEventUpdateScope } from "@core/types/event.types";
import { StringV4Schema } from "@core/types/type.utils";
import { closeFloatingAtCursor } from "@web/common/hooks/useOpenAtCursor";
import { deleteEventSlice } from "@web/ducks/events/slices/event.slice";
import { eventsStore, getDraft, resetDraft } from "@web/store/events";
import { useAppDispatch } from "@web/store/store.hooks";

/**
 * useDeleteEvent
 *
 * **important** use within Day View for now
 */
export function useDeleteEvent(_id: string) {
  const dispatch = useAppDispatch();

  const deleteEvent = useCallback(
    (
      applyTo: RecurringEventUpdateScope = RecurringEventUpdateScope.THIS_EVENT,
    ) => {
      const existingEvent = eventsStore.query(getEntity(_id));
      const draft = eventsStore.query((state) => getDraft(state));
      const event = existingEvent ?? draft;
      const { data: _title } = StringV4Schema.safeParse(event?.title);
      const title = _title ?? "this event";
      const usePrefix = applyTo === RecurringEventUpdateScope.ALL_EVENTS;
      const prefix = usePrefix ? "all instances of - " : "";

      const confirmed = window.confirm(`Delete ${prefix}${title}?`);

      if (confirmed) {
        if (event?._id && !!existingEvent) {
          dispatch(
            deleteEventSlice.actions.request({
              _id: event._id,
              applyTo,
            }),
          );
        }

        resetDraft();
        closeFloatingAtCursor();
      }
    },
    [dispatch, _id],
  );

  return deleteEvent;
}
