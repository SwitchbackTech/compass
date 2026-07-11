import { Priorities } from "@core/constants/core.constants";
import { type Event } from "@core/types/event.contracts";
import { type Schema_Event } from "@core/types/event.types";
import { type RecurrenceScope } from "@core/types/event-command.contracts";
import { getBrowserTimeZone } from "@web/common/utils/datetime/web.date.util";
import {
  type ParseEventDraftResult,
  parseEventDraft,
} from "@web/events/event-draft.parser";
import {
  type EventDraft,
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

export function parseGridEventDraft(
  draft: GridEventDraft,
): ParseEventDraftResult {
  const eventDraft: EventDraft =
    draft.kind === "create"
      ? {
          mode: "create",
          isDirty: true,
          submitError: null,
          values: draft.values,
        }
      : {
          mode: "edit",
          eventId: draft.source.id,
          originalCalendarId: draft.source.calendarId,
          isDirty: true,
          submitError: null,
          values: draft.values,
        };

  return parseEventDraft(eventDraft);
}

export function timedGridSchedule(start: Date, end: Date): GridScheduleDraft {
  return { kind: "timed", start, end, timeZone: getBrowserTimeZone() };
}

// TODO(packet-03-phase-3c): remove once remaining grid consumers no longer
// require Schema_Event. Keeping this projection beside the GridEventDraft
// adapter lets the draft store expose one canonical grid draft without a
// second store while legacy consumers are migrated incrementally.
export function gridEventDraftToSchemaEvent(
  draft: GridEventDraft,
): Schema_Event {
  const { schedule } = draft.values;

  return {
    _id: draft.kind === "edit" ? draft.source.id : undefined,
    description: draft.values.description,
    endDate:
      schedule.kind === "allDay"
        ? toDateOnlyString(schedule.end)
        : schedule.end.toISOString(),
    isAllDay: schedule.kind === "allDay",
    isSomeday: false,
    priority: draft.values.priority ?? Priorities.UNASSIGNED,
    startDate:
      schedule.kind === "allDay"
        ? toDateOnlyString(schedule.start)
        : schedule.start.toISOString(),
    title: draft.values.title,
  };
}

const toDateOnlyString = (date: Date) => date.toISOString().slice(0, 10);
