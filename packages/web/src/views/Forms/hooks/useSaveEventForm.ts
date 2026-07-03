import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  type Recurrence,
  RecurringEventUpdateScope,
  type Schema_Event,
} from "@core/types/event.types";
import { useUpdateEvent } from "@web/common/hooks/useUpdateEvent";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { useEventMutations } from "@web/ducks/events/mutations/useEventMutations";
import { findEventInCache } from "@web/ducks/events/queries/event.query.cache";
import { useCloseEventForm } from "@web/views/Forms/hooks/useCloseEventForm";
import { OnSubmitParser } from "@web/views/Week/components/Draft/hooks/actions/submit.parser";

export function useSaveEventForm() {
  const closeEventForm = useCloseEventForm();
  const queryClient = useQueryClient();
  const updateEvent = useUpdateEvent();
  const { create } = useEventMutations();

  const onCreate = useCallback(
    (draft: Schema_GridEvent) => {
      const event = new OnSubmitParser(draft).parse();
      create({
        ...event,
        recurrence: event.recurrence as Recurrence["recurrence"],
      });
    },
    [create],
  );

  const onEdit = useCallback(
    (
      draft: Schema_GridEvent,
      applyTo: RecurringEventUpdateScope = RecurringEventUpdateScope.THIS_EVENT,
    ) => {
      const event = new OnSubmitParser(draft).parse();

      updateEvent({ event, applyTo });
    },
    [updateEvent],
  );

  const saveEventForm = useCallback(
    (
      draft: Schema_Event | null,
      applyTo: RecurringEventUpdateScope = RecurringEventUpdateScope.THIS_EVENT,
    ) => {
      if (!draft) return closeEventForm();

      const existing = Boolean(
        draft._id && findEventInCache(queryClient, draft._id),
      );

      if (existing) {
        onEdit(draft as Schema_GridEvent, applyTo);
      } else {
        onCreate(draft as Schema_GridEvent);
      }

      closeEventForm();
    },
    [closeEventForm, onEdit, onCreate, queryClient],
  );

  return saveEventForm;
}
