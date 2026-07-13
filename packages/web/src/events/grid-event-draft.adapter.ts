import { Priorities } from "@core/constants/core.constants";
import { type Calendar } from "@core/types/calendar.contracts";
import { type CalendarId, type EventId } from "@core/types/domain-primitives";
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
  clientId?: EventId,
  calendarId: CalendarId | null = null,
): GridEventDraft {
  return {
    kind: "create",
    source: null,
    clientId,
    values: {
      title: "",
      description: "",
      schedule,
      priority: Priorities.UNASSIGNED,
      calendarId,
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
//
// Defaults the new draft's calendar to the source event's calendar only when
// that calendar is still writable - duplicating an event viewed on a
// read-only calendar can't recreate it there, so this leaves calendarId
// unset and lets the same null-calendarId fallback every other new draft
// uses (CalendarSelect's displayed default, useSaveEventForm.ts/
// useDraftActions.ts's submit-time fallback) pick the default target
// calendar instead.
export function duplicateGridEventDraft(
  event: Event,
  calendars: Calendar[],
): GridEventDraft | null {
  const schedule = gridScheduleFromEvent(event);
  if (!schedule) return null;

  const sourceCalendar = calendars.find(
    (calendar) => calendar.id === event.calendarId,
  );
  const calendarId: CalendarId | null = sourceCalendar?.capabilities.canWrite
    ? event.calendarId
    : null;

  return {
    kind: "create",
    source: null,
    values: {
      title: event.content.kind === "details" ? event.content.title : "",
      description:
        event.content.kind === "details" ? event.content.description : "",
      schedule,
      priority: event.priority,
      calendarId,
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

// Mirrors event.legacy-bridge.ts's legacyRecurrenceFromEvent, duplicated
// locally so this adapter doesn't depend on the bridge file being dissolved
// (see event.view-model.ts's prior conversion for the same pattern).
function legacyRecurrenceFromEvent(event: Event): Schema_Event["recurrence"] {
  return event.recurrence.kind === "series"
    ? { rule: [...event.recurrence.rules], eventId: event.id }
    : event.recurrence.kind === "occurrence"
      ? { eventId: event.recurrence.seriesId }
      : undefined;
}

// Reflects the draft's *live* recurrence edit (e.g. from RecurrenceSection's
// toggle, mid-form), not just the source event's original recurrence — a
// user editing recurrence on an existing draft must see that edit echoed
// back through the Schema_Event projection the form renders from.
function legacyRecurrenceFromDraft(
  draft: GridEventDraft,
): Schema_Event["recurrence"] {
  const { recurrence } = draft.values;

  if (draft.kind === "edit" && recurrence.kind === "preserve") {
    return legacyRecurrenceFromEvent(draft.source);
  }

  if (recurrence.kind === "series") {
    const eventId =
      draft.kind === "edit" && draft.source.recurrence.kind === "occurrence"
        ? draft.source.recurrence.seriesId
        : undefined;

    return { rule: [...recurrence.rules], ...(eventId ? { eventId } : {}) };
  }

  // "single": explicitly no recurrence. `rule: null` (not undefined)
  // mirrors useRecurrence.ts's toggleRecurrence-off shape so `hasRecurrence`
  // reads false rather than falling through to a stale truthy rule.
  return { rule: null as unknown as string[] };
}

// TODO(packet-03-phase-3c): remove once remaining grid consumers no longer
// require Schema_Event. Keeping this projection beside the GridEventDraft
// adapter lets the draft store expose one canonical grid draft without a
// second store while legacy consumers are migrated incrementally.
//
// Return type is widened (rather than adding calendarId/isBusy to the shared,
// hand-written core `Schema_Event` interface, which 10+ unrelated consumers
// also use) so the calendar-colored card accent/label stays correct on a
// dragging/resizing existing-event placeholder (draft.store.ts stores this
// projection for that display path) without touching Schema_Event itself.
// isBusy is derived straight from the edit draft's real source event (never
// from `values.title`, which stays "" for a busy source - see
// editGridEventDraft) - it's what lets the right-click context menu
// (GridContextMenuWrapper.tsx -> draft store -> ContextMenu's `event` prop)
// resolve the read-only gate without a second, separate lookup (packet 08
// step 8).
export function gridEventDraftToSchemaEvent(
  draft: GridEventDraft,
): Schema_Event & { calendarId?: CalendarId; isBusy?: boolean } {
  const { schedule } = draft.values;

  return {
    _id: draft.kind === "edit" ? draft.source.id : draft.clientId,
    calendarId: draft.values.calendarId ?? undefined,
    description: draft.values.description,
    endDate:
      schedule.kind === "allDay"
        ? toDateOnlyString(schedule.end)
        : dayjs(schedule.end).format(),
    isAllDay: schedule.kind === "allDay",
    isBusy: draft.kind === "edit" && draft.source.content.kind === "busy",
    priority: draft.values.priority ?? Priorities.UNASSIGNED,
    recurrence: legacyRecurrenceFromDraft(draft),
    startDate:
      schedule.kind === "allDay"
        ? toDateOnlyString(schedule.start)
        : dayjs(schedule.start).format(),
    title: draft.values.title,
  };
}

// The reverse direction of gridEventDraftToSchemaEvent, scoped to the one
// boundary that needs it: EventForm/RecurrenceSection write back into a
// legacy Schema_Event-shaped `setEvent`, which this reapplies onto the
// canonical GridEventDraft (preserving `kind`/`source`/`clientId`, which a
// Schema_Event patch has no way to express).
export function applySchemaEventPatchToGridDraft(
  current: GridEventDraft,
  patch: Schema_Event,
): GridEventDraft {
  const rule = patch.recurrence?.rule;
  const recurrence =
    Array.isArray(rule) && rule.length > 0
      ? ({ kind: "series", rules: rule } as const)
      : current.kind === "edit"
        ? ({ kind: "preserve" } as const)
        : ({ kind: "single" } as const);

  const scheduleDates: GridScheduleDraft =
    current.values.schedule.kind === "allDay"
      ? {
          kind: "allDay",
          start: patch.startDate
            ? dayjs(patch.startDate).toDate()
            : current.values.schedule.start,
          end: patch.endDate
            ? dayjs(patch.endDate).toDate()
            : current.values.schedule.end,
        }
      : {
          kind: "timed",
          start: patch.startDate
            ? dayjs(patch.startDate).toDate()
            : current.values.schedule.start,
          end: patch.endDate
            ? dayjs(patch.endDate).toDate()
            : current.values.schedule.end,
          timeZone: current.values.schedule.timeZone,
        };

  const sharedValues = {
    title: patch.title ?? "",
    description: patch.description ?? "",
    schedule: scheduleDates,
    priority: patch.priority ?? current.values.priority,
  };

  if (current.kind === "create") {
    return {
      ...current,
      values: {
        ...sharedValues,
        calendarId: current.values.calendarId,
        recurrence:
          recurrence.kind === "preserve" ? { kind: "single" } : recurrence,
      },
    };
  }

  return {
    ...current,
    values: {
      ...sharedValues,
      calendarId: current.values.calendarId,
      recurrence,
      scope: current.values.scope,
    },
  };
}

const toDateOnlyString = (date: Date) => date.toISOString().slice(0, 10);
