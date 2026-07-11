import { Priorities } from "@core/constants/core.constants";
import { type Event } from "@core/types/event.contracts";
import { type RecurrenceScope } from "@core/types/event-command.contracts";
import { getBrowserTimeZone } from "@web/common/utils/datetime/web.date.util";
import {
  type GridEventDraft,
  type GridScheduleDraft,
} from "@web/events/event-draft.types";

export function createGridEventDraft(
  schedule: GridScheduleDraft,
): GridEventDraft {
  return {
    kind: "create",
    source: null,
    values: {
      title: "",
      description: "",
      schedule,
      priority: Priorities.UNASSIGNED,
      calendarId: null,
      recurrence: { kind: "single" },
    },
  };
}

export function editGridEventDraft(
  event: Event,
  scope: RecurrenceScope = "this",
): GridEventDraft | null {
  if (event.schedule.kind === "someday") return null;

  return {
    kind: "edit",
    source: event,
    values: {
      title: event.content.kind === "details" ? event.content.title : "",
      description:
        event.content.kind === "details" ? event.content.description : "",
      schedule:
        event.schedule.kind === "timed"
          ? {
              kind: "timed",
              start: new Date(event.schedule.start),
              end: new Date(event.schedule.end),
              timeZone: event.schedule.timeZone,
            }
          : {
              kind: "allDay",
              start: new Date(event.schedule.start),
              end: new Date(event.schedule.end),
            },
      priority: event.priority,
      calendarId: event.calendarId,
      recurrence: { kind: "preserve" },
      scope,
    },
  };
}

export function replaceGridDraftSchedule(
  draft: GridEventDraft,
  schedule: GridScheduleDraft,
): GridEventDraft {
  if (draft.kind === "create") {
    return {
      ...draft,
      values: { ...draft.values, schedule },
    };
  }

  return {
    ...draft,
    values: { ...draft.values, schedule },
  };
}

export function timedGridSchedule(start: Date, end: Date): GridScheduleDraft {
  return { kind: "timed", start, end, timeZone: getBrowserTimeZone() };
}
