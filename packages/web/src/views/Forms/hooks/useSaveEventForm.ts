import { useCallback, useState } from "react";
import { useCalendarsQuery } from "@web/calendars/calendar.query";
import { useDefaultTargetCalendar } from "@web/calendars/useDefaultTargetCalendar";
import { RecurringEventUpdateScope } from "@web/common/types/web.event.types";
import { type GridEventDraft } from "@web/events/event-draft.types";
import { parseGridEventDraft } from "@web/events/grid-event-draft.adapter";
import { useEventMutations } from "@web/events/mutations/useEventMutations";
import { toRecurrenceScope } from "@web/events/recurrence/recurrence-scope";
import { useCloseEventForm } from "@web/views/Forms/hooks/useCloseEventForm";

export function useSaveEventForm() {
  const closeEventForm = useCloseEventForm();
  const { create, replace } = useEventMutations();
  const { data: calendars } = useCalendarsQuery();
  const defaultTargetCalendarId = useDefaultTargetCalendar(calendars ?? [])?.id;
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const clearFieldErrors = useCallback(() => {
    setFieldErrors({});
  }, []);

  const saveEventForm = useCallback(
    (
      draft: GridEventDraft | null,
      applyTo: RecurringEventUpdateScope = RecurringEventUpdateScope.THIS_EVENT,
    ) => {
      if (!draft) {
        clearFieldErrors();
        return closeEventForm();
      }

      if (draft.kind === "create") {
        // Respects a calendar the user explicitly chose via CalendarSelect;
        // only an untouched draft (calendarId still null) falls back to the
        // default target calendar.
        const calendarId = draft.values.calendarId ?? defaultTargetCalendarId;
        if (!calendarId) {
          setFieldErrors({ calendarId: "Calendar is required" });
          return;
        }

        const parsed = parseGridEventDraft({
          ...draft,
          values: { ...draft.values, calendarId },
        });

        if (!parsed.ok) {
          setFieldErrors(parsed.fieldErrors);
          return;
        }

        if (parsed.mode === "create") {
          clearFieldErrors();
          // Closing via the callback (not after `create` returns) keeps the draft
          // card mounted until the optimistic insert exists, so the saved card
          // replaces it in one commit instead of flashing empty.
          create(parsed.input, { onOptimisticApplied: closeEventForm });
        }
        return;
      }

      const scope = toRecurrenceScope(applyTo);
      const parsed = parseGridEventDraft({
        ...draft,
        values: { ...draft.values, scope },
      });

      if (!parsed.ok) {
        setFieldErrors(parsed.fieldErrors);
        return;
      }

      if (parsed.mode === "edit") {
        clearFieldErrors();
        replace({ id: parsed.eventId, input: parsed.input });
        closeEventForm();
      }
    },
    [
      defaultTargetCalendarId,
      clearFieldErrors,
      closeEventForm,
      create,
      replace,
    ],
  );

  return { saveEventForm, fieldErrors, clearFieldErrors };
}
