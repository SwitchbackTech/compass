import { useCallback } from "react";
import { RecurringEventUpdateScope } from "@core/types/event.types";
import { useCalendarsQuery } from "@web/calendars/calendar.query";
import { getDefaultTargetCalendar } from "@web/calendars/calendar.util";
import { type GridEventDraft } from "@web/events/event-draft.types";
import { parseGridEventDraft } from "@web/events/grid-event-draft.adapter";
import { useEventMutations } from "@web/events/mutations/useEventMutations";
import { toRecurrenceScope } from "@web/events/recurrence/recurrence-scope";
import { useCloseEventForm } from "@web/views/Forms/hooks/useCloseEventForm";

export function useSaveEventForm() {
  const closeEventForm = useCloseEventForm();
  const { create, replace } = useEventMutations();
  const { data: calendars } = useCalendarsQuery();

  const saveEventForm = useCallback(
    (
      draft: GridEventDraft | null,
      applyTo: RecurringEventUpdateScope = RecurringEventUpdateScope.THIS_EVENT,
    ) => {
      if (!draft) return closeEventForm();

      if (draft.kind === "create") {
        // Respects a calendar the user explicitly chose via CalendarSelect;
        // only an untouched draft (calendarId still null) falls back to the
        // default target calendar.
        const calendarId =
          draft.values.calendarId ??
          getDefaultTargetCalendar(calendars ?? [])?.id;
        if (!calendarId) return closeEventForm();

        const parsed = parseGridEventDraft({
          ...draft,
          values: { ...draft.values, calendarId },
        });

        if (parsed.ok && parsed.mode === "create") {
          create(parsed.input);
        }
      } else {
        const scope = toRecurrenceScope(applyTo);
        const parsed = parseGridEventDraft({
          ...draft,
          values: { ...draft.values, scope },
        });

        if (parsed.ok && parsed.mode === "edit") {
          replace({ id: parsed.eventId, input: parsed.input });
        }
      }

      closeEventForm();
    },
    [calendars, closeEventForm, create, replace],
  );

  return saveEventForm;
}
