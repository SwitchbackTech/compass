import fastDeepEqual from "fast-deep-equal/react";
import { type Calendar } from "@core/types/calendar.contracts";
import { type CompassEvent } from "@core/types/compass-event.contracts";
import { type CalendarId, type EventId } from "@core/types/domain-primitives";
import { type Event } from "@core/types/event.contracts";
import { type RecurrenceScope } from "@core/types/event-command.contracts";
import dayjs from "@core/util/date/dayjs";
import { type GridEvent } from "@web/common/types/web.event.types";
import { getBrowserTimeZone } from "@web/common/utils/datetime/web.date.util";
import { assembleGridEvent } from "@web/common/utils/event/event.util";
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
    return allDayGridSchedule(schedule.start, schedule.end);
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
      calendarId,
      recurrence: { kind: "single" },
    },
  };
}

export function createGridEventDraftFromGridEvent(
  event: GridEvent,
  sourceEvent?: Event | null,
): GridEventDraft | null {
  if (sourceEvent) {
    return editGridEventDraft(sourceEvent);
  }

  if (!event.startDate || !event.endDate) {
    return null;
  }

  return createGridEventDraft(
    event.isAllDay
      ? {
          kind: "allDay",
          start: new Date(event.startDate),
          end: new Date(event.endDate),
        }
      : timedGridSchedule(new Date(event.startDate), new Date(event.endDate)),
    event._id ? (event._id as EventId) : undefined,
    event.calendarId ?? null,
  );
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

// All-day draft Dates are local midnight everywhere (drag creation, form
// patches, shortcuts). new Date("YYYY-MM-DD") would parse as UTC midnight,
// which reads as the previous day when formatted back in local time west of
// UTC — dayjs parses date-only strings as local.
export function allDayGridSchedule(
  start: string,
  end: string,
): GridScheduleDraft {
  return {
    kind: "allDay",
    start: dayjs(start).toDate(),
    end: dayjs(end).toDate(),
  };
}

// Mirrors event.view-model.ts's scheduledEventToSchemaEvent recurrence
// conversion (the now-deleted event.legacy-bridge.ts used the same mapping),
// duplicated locally so this adapter has no dependency on that module.
//
// An occurrence's own recurrence pointer carries no rule (only the series
// base does), so opening one always reads as non-recurring unless the
// caller resolves the base event and passes its rules through - see
// EventForm.tsx's `seriesRules`.
function legacyRecurrenceFromEvent(
  event: Event,
  seriesRules?: readonly string[],
): CompassEvent["recurrence"] {
  return event.recurrence.kind === "series"
    ? { rule: [...event.recurrence.rules], eventId: event.id }
    : event.recurrence.kind === "occurrence"
      ? {
          eventId: event.recurrence.seriesId,
          ...(seriesRules?.length ? { rule: [...seriesRules] } : {}),
        }
      : undefined;
}

// Reflects the draft's *live* recurrence edit (e.g. from RecurrenceSection's
// toggle, mid-form), not just the source event's original recurrence — a
// user editing recurrence on an existing draft must see that edit echoed
// back through the CompassEvent projection the form renders from.
function legacyRecurrenceFromDraft(
  draft: GridEventDraft,
  seriesRules?: readonly string[],
): CompassEvent["recurrence"] {
  const { recurrence } = draft.values;

  if (draft.kind === "edit" && recurrence.kind === "preserve") {
    return legacyRecurrenceFromEvent(draft.source, seriesRules);
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

export function getGridDraftId(draft: GridEventDraft): string | undefined {
  return draft.kind === "edit" ? draft.source.id : draft.clientId;
}

export function gridEventDraftToGridEvent(draft: GridEventDraft): GridEvent {
  const schemaEvent = gridEventDraftToSchemaEvent(draft);
  return assembleGridEvent({
    ...schemaEvent,
    startDate: schemaEvent.startDate!,
    endDate: schemaEvent.endDate!,
  });
}

// TODO(packet-03-phase-3c): remove once remaining grid consumers no longer
// require CompassEvent. Keeping this projection beside the GridEventDraft
// adapter lets the draft store expose one canonical grid draft without a
// second store while legacy consumers are migrated incrementally.
//
// Return type is widened (rather than adding calendarId/isBusy to the shared,
// hand-written core `CompassEvent` interface, which 10+ unrelated consumers
// also use) so the calendar-colored card accent/label stays correct on a
// dragging/resizing existing-event placeholder (draft.store.ts stores this
// projection for that display path) without touching CompassEvent itself.
// isBusy is derived straight from the edit draft's real source event (never
// from `values.title`, which stays "" for a busy source - see
// editGridEventDraft) - it's what lets the right-click context menu
// (GridContextMenuWrapper.tsx -> draft store -> ContextMenu's `event` prop)
// resolve the read-only gate without a second, separate lookup (packet 08
// step 8).
export function gridEventDraftToSchemaEvent(
  draft: GridEventDraft,
  seriesRules?: readonly string[],
): CompassEvent & { calendarId?: CalendarId; isBusy?: boolean } {
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
    recurrence: legacyRecurrenceFromDraft(draft, seriesRules),
    startDate:
      schedule.kind === "allDay"
        ? toDateOnlyString(schedule.start)
        : dayjs(schedule.start).format(),
    title: draft.values.title,
  };
}

// The reverse direction of gridEventDraftToSchemaEvent for recurrence rule
// resolution on the form hot path. Grid rendering consumers still use the
// CompassEvent projection above; the form reads/writes GridEventDraft directly.
export function resolveDraftRecurrenceRules(
  draft: GridEventDraft,
  seriesRules?: readonly string[],
): string[] {
  const rule = legacyRecurrenceFromDraft(draft, seriesRules)?.rule;
  return Array.isArray(rule) ? [...rule] : [];
}

export function patchGridDraftRecurrence(
  draft: GridEventDraft,
  nextRules: readonly string[],
  seriesRules?: readonly string[],
): GridEventDraft {
  const currentRules = resolveDraftRecurrenceRules(draft, seriesRules);
  const ruleUnchanged = fastDeepEqual(currentRules, [...nextRules]);
  const recurrence = ruleUnchanged
    ? draft.values.recurrence
    : nextRules.length > 0
      ? { kind: "series" as const, rules: [...nextRules] }
      : draft.kind === "edit"
        ? ({ kind: "preserve" } as const)
        : ({ kind: "single" } as const);

  if (draft.kind === "create") {
    return {
      ...draft,
      values: {
        ...draft.values,
        recurrence:
          recurrence.kind === "preserve" ? { kind: "single" } : recurrence,
      },
    };
  }

  return {
    ...draft,
    values: {
      ...draft.values,
      recurrence,
    },
  };
}

export function patchGridDraftScheduleDates(
  current: GridEventDraft,
  patch: { startDate?: string; endDate?: string },
): GridEventDraft {
  const { schedule } = current.values;
  const nextSchedule: GridScheduleDraft =
    schedule.kind === "allDay"
      ? {
          kind: "allDay",
          start: patch.startDate
            ? dayjs(patch.startDate).toDate()
            : schedule.start,
          end: patch.endDate ? dayjs(patch.endDate).toDate() : schedule.end,
        }
      : {
          kind: "timed",
          start: patch.startDate
            ? dayjs(patch.startDate).toDate()
            : schedule.start,
          end: patch.endDate ? dayjs(patch.endDate).toDate() : schedule.end,
          timeZone: schedule.timeZone,
        };

  if (current.kind === "create") {
    return {
      ...current,
      values: { ...current.values, schedule: nextSchedule },
    };
  }

  return { ...current, values: { ...current.values, schedule: nextSchedule } };
}

export function patchGridDraftFields(
  current: GridEventDraft,
  patch: Partial<Pick<GridEventDraft["values"], "title" | "description">>,
): GridEventDraft {
  if (current.kind === "create") {
    return {
      ...current,
      values: {
        ...current.values,
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.description !== undefined
          ? { description: patch.description }
          : {}),
      },
    };
  }

  return {
    ...current,
    values: {
      ...current.values,
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.description !== undefined
        ? { description: patch.description }
        : {}),
    },
  };
}

// Local, not toISOString: all-day draft Dates are local midnight, so a UTC
// rendering would shift the day for any non-UTC viewer.
const toDateOnlyString = (date: Date) => dayjs(date).toYearMonthDayString();
