import { Priorities } from "@core/constants/core.constants";
import { type Event } from "@core/types/event.contracts";
import { type Schema_Event } from "@core/types/event.types";
import { type RecurrenceScope } from "@core/types/event-command.contracts";
import dayjs from "@core/util/date/dayjs";
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
import { legacyRecurrenceFromEvent } from "@web/events/queries/event.legacy-bridge";

function gridScheduleFromEvent(event: Event): GridScheduleDraft | null {
  const { schedule } = event;

  if (schedule.kind === "timed") {
    return {
      kind: "timed",
      start: new Date(schedule.start),
      end: new Date(schedule.end),
      timeZone: schedule.timeZone,
    };
  }

  if (schedule.kind === "allDay") {
    return {
      kind: "allDay",
      start: new Date(schedule.start),
      end: new Date(schedule.end),
    };
  }

  return null;
}

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
  const schedule = gridScheduleFromEvent(event);
  if (!schedule) return null;

  return {
    kind: "edit",
    source: event,
    values: {
      title: event.content.kind === "details" ? event.content.title : "",
      description:
        event.content.kind === "details" ? event.content.description : "",
      schedule,
      priority: event.priority,
      calendarId: event.calendarId,
      recurrence: { kind: "preserve" },
      scope,
    },
  };
}

// A duplicate is a brand-new, standalone event: it starts from the source
// event's fields but is never linked back to it (kind "create", source
// null), so editing/deleting the duplicate never touches the original.
export function duplicateGridEventDraft(event: Event): GridEventDraft | null {
  const schedule = gridScheduleFromEvent(event);
  if (!schedule) return null;

  return {
    kind: "create",
    source: null,
    values: {
      title: event.content.kind === "details" ? event.content.title : "",
      description:
        event.content.kind === "details" ? event.content.description : "",
      schedule,
      priority: event.priority,
      calendarId: event.calendarId,
      recurrence: { kind: "single" },
    },
  };
}

// The two branches look identical, but each is required to keep GridEventDraft's
// discriminated union narrowed: spreading `draft` without branching on `kind`
// loses the correlation between `kind` and `values`'s create/edit shape.
export function replaceGridDraftSchedule(
  draft: GridEventDraft,
  schedule: GridScheduleDraft,
): GridEventDraft {
  if (draft.kind === "create") {
    return { ...draft, values: { ...draft.values, schedule } };
  }

  return { ...draft, values: { ...draft.values, schedule } };
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
        : dayjs(schedule.end).format(),
    isAllDay: schedule.kind === "allDay",
    isSomeday: false,
    priority: draft.values.priority ?? Priorities.UNASSIGNED,
    recurrence:
      draft.kind === "edit"
        ? legacyRecurrenceFromEvent(draft.source)
        : undefined,
    startDate:
      schedule.kind === "allDay"
        ? toDateOnlyString(schedule.start)
        : dayjs(schedule.start).format(),
    title: draft.values.title,
  };
}

const toDateOnlyString = (date: Date) => date.toISOString().slice(0, 10);
