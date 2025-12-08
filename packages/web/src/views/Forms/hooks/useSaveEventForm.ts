import { useCallback } from "react";
import {
  Recurrence,
  RecurringEventUpdateScope,
  Schema_Event,
} from "@core/types/event.types";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import {
  createEventSlice,
  editEventSlice,
} from "@web/ducks/events/slices/event.slice";
import { useAppDispatch } from "@web/store/store.hooks";
import { OnSubmitParser } from "@web/views/Calendar/components/Draft/hooks/actions/submit.parser";

export function useSaveEventForm({
  existing,
  closeEventForm,
}: {
  existing: boolean;
  closeEventForm: () => void;
}) {
  const dispatch = useAppDispatch();

  const onCreate = useCallback(
    (draft: Schema_GridEvent) => {
      const event = new OnSubmitParser(draft).parse();
      dispatch(
        createEventSlice.actions.request({
          ...event,
          recurrence: event.recurrence as Recurrence["recurrence"],
        }),
      );
    },
    [dispatch],
  );

  const onEdit = useCallback(
    (
      draft: Schema_GridEvent,
      applyTo: RecurringEventUpdateScope = RecurringEventUpdateScope.THIS_EVENT,
    ) => {
      const event = new OnSubmitParser(draft).parse();

      dispatch(
        editEventSlice.actions.request({
          _id: event._id!,
          event,
          applyTo,
        }),
      );
    },
    [dispatch],
  );

  const saveEventForm = useCallback(
    (
      draft: Schema_Event | null,
      applyTo: RecurringEventUpdateScope = RecurringEventUpdateScope.THIS_EVENT,
    ) => {
      if (!draft) return closeEventForm();

      if (existing) {
        onEdit(draft as Schema_GridEvent, applyTo);
      } else {
        onCreate(draft as Schema_GridEvent);
      }

      closeEventForm();
    },
    [existing, onCreate, onEdit, closeEventForm],
  );

  return saveEventForm;
}
