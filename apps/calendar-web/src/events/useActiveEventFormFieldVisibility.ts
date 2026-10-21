import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { type EventFormFieldVisibilityInput } from "@core/event/event-form-field-visibility";
import { useCalendarsQuery } from "@web/calendars/calendar.query";
import { buildCalendarLookup } from "@web/calendars/useCalendarLookup";
import { useDefaultTargetCalendar } from "@web/calendars/useDefaultTargetCalendar";
import {
  editSequenceFieldByKey,
  eventFormFieldVisibilityInputFromDraft,
  eventFormFieldVisibilityInputFromEvent,
  eventFormFieldVisibilityInputFromGridEvent,
  visibleEditSequenceLetterFields,
  visibleFormFieldDigitRows,
} from "@web/events/event-form-field-visibility.util";
import { findEventInCache } from "@web/events/queries/event.query.cache";
import {
  selectIsEventFormOpen,
  useDraftStore,
} from "@web/events/stores/draft.store";
import {
  type FocusableGridEventTarget,
  findCalendarEventForTarget,
} from "@web/grid/shortcuts/focus-adjacent-grid-event";

export function useActiveEventFormFieldVisibility({
  allDayEvents = [],
  getFocused,
  timedEvents,
}: {
  allDayEvents?: Parameters<
    typeof findCalendarEventForTarget
  >[1]["allDayEvents"];
  getFocused: () => FocusableGridEventTarget | null;
  timedEvents: Parameters<typeof findCalendarEventForTarget>[1]["timedEvents"];
}) {
  const queryClient = useQueryClient();
  const isFormOpen = useDraftStore(selectIsEventFormOpen);
  const gridDraft = useDraftStore((state) => state.gridDraft);
  const { data: calendars } = useCalendarsQuery();
  const calendarLookup = useMemo(
    () => buildCalendarLookup(calendars),
    [calendars],
  );
  const defaultTargetCalendar = useDefaultTargetCalendar(calendars ?? []);

  const resolveVisibilityInput =
    useCallback((): EventFormFieldVisibilityInput | null => {
      if (isFormOpen && gridDraft) {
        return eventFormFieldVisibilityInputFromDraft(
          gridDraft,
          calendarLookup,
          defaultTargetCalendar,
        );
      }

      const target = getFocused();
      if (!target) return null;

      const gridEvent = findCalendarEventForTarget(target, {
        allDayEvents,
        timedEvents,
      });
      if (!gridEvent?._id) return null;

      const sourceEvent = findEventInCache(queryClient, gridEvent._id);
      if (sourceEvent) {
        return eventFormFieldVisibilityInputFromEvent(
          sourceEvent,
          calendarLookup,
        );
      }

      return eventFormFieldVisibilityInputFromGridEvent(
        gridEvent,
        calendarLookup,
      );
    }, [
      allDayEvents,
      calendarLookup,
      defaultTargetCalendar,
      getFocused,
      gridDraft,
      isFormOpen,
      queryClient,
      timedEvents,
    ]);

  const letterFields = useMemo(() => {
    const input = resolveVisibilityInput();
    return input ? visibleEditSequenceLetterFields(input) : [];
  }, [resolveVisibilityInput]);

  const digitRows = useMemo(() => {
    const input = resolveVisibilityInput();
    return input ? visibleFormFieldDigitRows(input) : [];
  }, [resolveVisibilityInput]);

  const fieldByKey = useMemo(() => {
    const input = resolveVisibilityInput();
    return input ? editSequenceFieldByKey(input) : {};
  }, [resolveVisibilityInput]);

  return {
    digitRows,
    fieldByKey,
    letterFields,
    resolveVisibilityInput,
  };
}
