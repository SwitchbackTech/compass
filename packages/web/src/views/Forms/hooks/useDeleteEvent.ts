import { useCallback } from "react";
import {
  RecurringEventUpdateScope,
  type Schema_Event,
} from "@core/types/event.types";
import { StringV4Schema } from "@core/types/type.utils";
import { useEventMutations } from "@web/events/mutations/useEventMutations";
import { useEventById } from "@web/events/queries/useEventById";
import {
  draftActions,
  selectDraft,
  useDraftStore,
} from "@web/events/stores/draft.store";

export function confirmAndDeleteEvent({
  applyTo = RecurringEventUpdateScope.THIS_EVENT,
  draft,
  deleteEvent,
  existingEvent,
}: {
  applyTo?: RecurringEventUpdateScope;
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

  draftActions.discard();

  return true;
}

/**
 * useDeleteEvent
 *
 * **important** use within Day View for now
 */
export function useDeleteEvent(_id: string) {
  const existingEvent = useEventById(_id);
  const { delete: deleteEventMutation } = useEventMutations();
  const draft = useDraftStore(selectDraft);

  const deleteEvent = useCallback(
    (
      applyTo: RecurringEventUpdateScope = RecurringEventUpdateScope.THIS_EVENT,
    ) =>
      confirmAndDeleteEvent({
        applyTo,
        draft,
        deleteEvent: deleteEventMutation,
        existingEvent,
      }),
    [deleteEventMutation, draft, existingEvent],
  );

  return deleteEvent;
}
