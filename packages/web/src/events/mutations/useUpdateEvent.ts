import { useQueryClient } from "@tanstack/react-query";
import fastDeepEqual from "fast-deep-equal/es6";
import { useCallback } from "react";
import { type Calendar } from "@core/types/calendar.contracts";
import dayjs from "@core/util/date/dayjs";
import { calendarQueryKeys } from "@web/calendars/calendar.query";
import { buildCalendarLookup } from "@web/calendars/useCalendarLookup";
import {
  type GridEvent,
  type RecurringEventUpdateScope,
} from "@web/common/types/web.event.types";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import {
  editGridEventDraft,
  parseGridEventDraft,
  timedGridSchedule,
} from "@web/events/grid-event-draft.adapter";
import {
  type EventMutationDependencies,
  useEventMutations,
} from "@web/events/mutations/useEventMutations";
import {
  findEventInCache,
  removeEventFromQueries,
} from "@web/events/queries/event.query.cache";
import { toRecurrenceScope } from "@web/events/recurrence/recurrence-scope";
import { draftActions } from "@web/events/stores/draft.store";

// The persisted-write half builds a GridEventDraft from the cached strict
// `Event` plus the incoming GridEvent's changed fields (schedule/
// title/description), matching
// WeekInteractionCoordinator.commitStrictSavedMutation (#2029), instead of
// hand-rolling a ReplaceEventInput via zod. Recurrence always stays
// "preserve" here — this hook only ever moves/resizes an existing event,
// never edits its recurrence rule.
//
// draftActions.setEvent still writes into the draft store's legacy
// `event: CompassEvent` projection: Day's grid rendering layers read the
// in-progress drag/resize position via `selectDraft`, and GridEventDraft has
// no field for that live pixel geometry (packet-03-phase-3c's documented
// out-of-scope local drag-geometry state).
export function useUpdateEvent(dependencies: EventMutationDependencies = {}) {
  const queryClient = useQueryClient();
  const { replace } = useEventMutations(dependencies);

  const update = useCallback(
    (
      payload: {
        event: GridEvent;
        shouldRemove?: boolean;
        applyTo?: RecurringEventUpdateScope;
      },
      saveImmediate = true,
    ) => {
      const { event, shouldRemove, applyTo } = payload;

      if (!event._id) return;

      draftActions.setEvent(event);

      if (!saveImmediate) return;

      if (shouldRemove) {
        removeEventFromQueries(queryClient, event._id);
        return;
      }

      const sourceEvent = findEventInCache(queryClient, event._id);
      if (!sourceEvent) return;

      // A differing calendarId means the drag dropped the event on another
      // calendar's column (Day view). Guard here so a blocked move reverts
      // the whole drag; the backend re-enforces both rules.
      const nextCalendarId =
        event.calendarId && event.calendarId !== sourceEvent.calendarId
          ? event.calendarId
          : null;
      if (nextCalendarId) {
        if (sourceEvent.recurrence.kind !== "single") {
          showErrorToast("Repeating events can't move to another calendar.");
          return;
        }
        const destination = buildCalendarLookup(
          queryClient.getQueryData<Calendar[]>(calendarQueryKeys.all),
        ).get(nextCalendarId);
        if (destination && !destination.capabilities.canWrite) {
          showErrorToast(`You can't move events to ${destination.name}.`);
          return;
        }
      }

      const sourceDraft = editGridEventDraft(
        sourceEvent,
        toRecurrenceScope(applyTo),
      );
      if (!sourceDraft || sourceDraft.kind !== "edit") return;

      const patchedDraft = {
        ...sourceDraft,
        values: {
          ...sourceDraft.values,
          title: event.title ?? sourceDraft.values.title,
          description: event.description ?? sourceDraft.values.description,
          schedule: event.isAllDay
            ? {
                kind: "allDay" as const,
                start: dayjs(event.startDate).toDate(),
                end: dayjs(event.endDate).toDate(),
              }
            : timedGridSchedule(
                dayjs(event.startDate).toDate(),
                dayjs(event.endDate).toDate(),
              ),
        },
      };

      if (
        !nextCalendarId &&
        fastDeepEqual(patchedDraft.values, sourceDraft.values)
      ) {
        return;
      }

      const parsed = parseGridEventDraft(patchedDraft);
      if (parsed.ok && parsed.mode === "edit") {
        replace({
          id: parsed.eventId,
          input: nextCalendarId
            ? { ...parsed.input, calendarId: nextCalendarId }
            : parsed.input,
        });
      }
    },
    [replace, queryClient],
  );

  return update;
}
