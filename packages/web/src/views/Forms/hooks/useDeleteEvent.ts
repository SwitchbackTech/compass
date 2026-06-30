import { useCallback } from "react";
import { RecurringEventUpdateScope } from "@core/types/event.types";
import { StringV4Schema } from "@core/types/type.utils";
import { selectDraft } from "@web/ducks/events/selectors/draft.selectors";
import { selectEventById } from "@web/ducks/events/selectors/event.selectors";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { deleteEventSlice } from "@web/ducks/events/slices/event.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";

/**
 * useDeleteEvent
 *
 * **important** use within Day View for now
 */
export function useDeleteEvent(_id: string) {
  const dispatch = useAppDispatch();
  const existingEvent = useAppSelector((state) =>
    _id ? selectEventById(state, _id) : null,
  );
  const draft = useAppSelector(selectDraft);

  const deleteEvent = useCallback(
    (
      applyTo: RecurringEventUpdateScope = RecurringEventUpdateScope.THIS_EVENT,
    ) => {
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

        dispatch(draftSlice.actions.discard(undefined));
      }
    },
    [dispatch, draft, existingEvent],
  );

  return deleteEvent;
}
