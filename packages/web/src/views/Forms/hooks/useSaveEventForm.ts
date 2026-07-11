import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  RecurringEventUpdateScope,
  type Schema_Event,
} from "@core/types/event.types";
import { useCalendarsQuery } from "@web/calendars/calendar.query";
import { getDefaultTargetCalendar } from "@web/calendars/calendar.util";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { useEventMutations } from "@web/events/mutations/useEventMutations";
import { useUpdateEvent } from "@web/events/mutations/useUpdateEvent";
import { schemaEventToCreateInput } from "@web/events/queries/event.legacy-bridge";
import { findEventInCache } from "@web/events/queries/event.query.cache";
import { useCloseEventForm } from "@web/views/Forms/hooks/useCloseEventForm";
import { OnSubmitParser } from "@web/views/Week/components/Draft/hooks/actions/submit.parser";

// TODO(packet-03-phase-3c): OnSubmitParser still produces a legacy
// Schema_Event; bridged onto CreateEventInput via schemaEventToCreateInput
// until the EventForm submits an EventDraft directly (event-draft.parser.ts).
export function useSaveEventForm() {
  const closeEventForm = useCloseEventForm();
  const queryClient = useQueryClient();
  const updateEvent = useUpdateEvent();
  const { create } = useEventMutations();
  const { data: calendars } = useCalendarsQuery();

  const onCreate = useCallback(
    (draft: Schema_GridEvent) => {
      const event = new OnSubmitParser(draft).parse();
      const calendarId = getDefaultTargetCalendar(calendars ?? [])?.id;
      if (!calendarId) return;
      const input = schemaEventToCreateInput(event, calendarId);
      if (!input) return;
      create(input);
    },
    [create, calendars],
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
