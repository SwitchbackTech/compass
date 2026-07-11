import { useQueryClient } from "@tanstack/react-query";
import fastDeepEqual from "fast-deep-equal/es6";
import { useCallback } from "react";
import { Priorities } from "@core/constants/core.constants";
import { EventIdSchema } from "@core/types/domain-primitives";
import { ScheduledScheduleSchema } from "@core/types/event.contracts";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { getBrowserTimeZone } from "@web/common/utils/datetime/web.date.util";
import {
  type Payload_EditEvent,
  type SliceStateContext,
} from "@web/events/event.types";
import { useEventMutations } from "@web/events/mutations/useEventMutations";
import {
  findEventInCache,
  removeEventFromQueries,
} from "@web/events/queries/event.query.cache";
import { toRecurrenceScope } from "@web/events/recurrence/recurrence-scope";
import { draftActions } from "@web/events/stores/draft.store";

// TODO(packet-03-phase-3c): bridges the legacy Schema_WebEvent grid-edit
// payload onto ReplaceEventInput until the draft store + inline-edit call
// sites (Week grid drag/resize) are converted to build EventDraft/
// ReplaceEventInput directly. Preserves recurrence (recurrence.kind
// "preserve") and maps the legacy applyTo scope via
// legacyScopeToRecurrenceScope.
export function useUpdateEvent() {
  const queryClient = useQueryClient();
  const { replace } = useEventMutations();

  const update = useCallback(
    (
      payload: Omit<Payload_EditEvent & SliceStateContext, "_id">,
      saveImmediate = true,
    ) => {
      const { event, shouldRemove, applyTo } = payload;

      if (!event._id) return;

      // NOT converted to GridEventDraft/startGridDraft: `payload.event` is a
      // Schema_GridEvent carrying live drag/resize geometry (`position`)
      // that GridEventDraft has no field for. This is the local
      // drag-geometry state called out as out of scope in the
      // packet-03-phase-3c scoping note.
      draftActions.setEvent(payload.event);

      if (!saveImmediate) return;

      const original = findEventInCache(queryClient, event._id) ?? {};
      const position = (event as Schema_GridEvent).position;
      const recurrence = event.recurrence;
      const equal = fastDeepEqual(event, { position, recurrence, ...original });

      if (equal) return;

      if (shouldRemove) {
        removeEventFromQueries(queryClient, event._id);
        return;
      }

      const id = EventIdSchema.safeParse(event._id);
      if (!id.success) return;

      const schedule = ScheduledScheduleSchema.safeParse(
        event.isAllDay
          ? { kind: "allDay", start: event.startDate, end: event.endDate }
          : {
              kind: "timed",
              start: event.startDate,
              end: event.endDate,
              timeZone: getBrowserTimeZone(),
            },
      );
      if (!schedule.success) return;

      replace({
        id: id.data,
        input: {
          content: {
            kind: "details",
            title: event.title ?? "",
            description: event.description ?? "",
          },
          schedule: schedule.data,
          recurrence: { kind: "preserve" },
          priority: event.priority ?? Priorities.UNASSIGNED,
          scope: toRecurrenceScope(applyTo),
        },
      });
    },
    [replace, queryClient],
  );

  return update;
}
