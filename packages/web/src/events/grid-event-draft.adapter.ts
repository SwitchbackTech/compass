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

// A duplicate is a brand-new, standalone event: it starts from the source
// event's fields but is never linked back to it (kind "create", source
// null), so editing/deleting the duplicate never touches the original.
export function duplicateGridEventDraft(event: Event): GridEventDraft | null {
  if (event.schedule.kind === "someday") return null;

  const schedule: GridScheduleDraft =
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
        };

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
    recurrence:
      draft.kind === "edit" ? recurrenceFromSource(draft.source) : undefined,
    startDate:
      schedule.kind === "allDay"
        ? toDateOnlyString(schedule.start)
        : schedule.start.toISOString(),
    title: draft.values.title,
  };
}

// Mirrors eventToSchemaEvent's recurrence mapping (event.legacy-bridge.ts) so
// consumers still reading the draft store's Schema_Event projection (e.g. the
// Week form's recurrence-scope UI) don't lose recurrence identity for edits
// of existing events routed through the GridEventDraft path.
function recurrenceFromSource(event: Event): Schema_Event["recurrence"] {
  return event.recurrence.kind === "series"
    ? { rule: [...event.recurrence.rules], eventId: event.id }
    : event.recurrence.kind === "occurrence"
      ? { eventId: event.recurrence.seriesId }
      : undefined;
}

const toDateOnlyString = (date: Date) => date.toISOString().slice(0, 10);
