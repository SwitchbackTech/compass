import { useCallback } from "react";
import {
  RecurringEventUpdateScope,
  type Schema_Event,
} from "@core/types/event.types";
import { StringV4Schema } from "@core/types/type.utils";
import { useEventMutations } from "@web/ducks/events/mutations/useEventMutations";
import { useEventById } from "@web/ducks/events/queries/useEventById";
import { selectDraft } from "@web/ducks/events/selectors/draft.selectors";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { type AppDispatch } from "@web/store";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";

export function confirmAndDeleteEvent({
  applyTo = RecurringEventUpdateScope.THIS_EVENT,
  dispatch,
  draft,
  deleteEvent,
  existingEvent,
}: {
  applyTo?: RecurringEventUpdateScope;
  dispatch: AppDispatch;
  draft?: Schema_Event | null;
  deleteEvent?: (payload: {
    _id: string;
    applyTo: RecurringEventUpdateScope;
  }) => void;
  existingEvent?: Schema_Event | null;
}) {
  const event = existingEvent ?? draft;
  const { data: _title } = StringV4Schema.safeParse(event?.title);
  const title = _title ?? "this event";
  const usePrefix = applyTo === RecurringEventUpdateScope.ALL_EVENTS;
  const prefix = usePrefix ? "all instances of - " : "";

  const confirmed = window.confirm(`Delete ${prefix}${title}?`);

  if (!confirmed) {
    return false;
  }

  if (event?._id && existingEvent) {
    deleteEvent?.({ _id: event._id, applyTo });
  }

  dispatch(draftSlice.actions.discard(undefined));

  return true;
}

/**
 * useDeleteEvent
 *
 * **important** use within Day View for now
 */
export function useDeleteEvent(_id: string) {
  const dispatch = useAppDispatch();
  const existingEvent = useEventById(_id);
  const { delete: deleteEventMutation } = useEventMutations();
  const draft = useAppSelector(selectDraft);

  const deleteEvent = useCallback(
    (
      applyTo: RecurringEventUpdateScope = RecurringEventUpdateScope.THIS_EVENT,
    ) =>
      confirmAndDeleteEvent({
        applyTo,
        dispatch,
        draft,
        deleteEvent: deleteEventMutation,
        existingEvent,
      }),
    [deleteEventMutation, dispatch, draft, existingEvent],
  );

  return deleteEvent;
}
