import { ObjectId } from "bson";
import { type Weekday } from "rrule";
import { Origin } from "@core/constants/core.constants";
import { type Calendar } from "@core/types/calendar.contracts";
import { type CompassEvent } from "@core/types/compass-event.contracts";
import { type CalendarId, type EventId } from "@core/types/domain-primitives";
import { type Event } from "@core/types/event.contracts";
import {
  type EventColorSlot,
  withColor,
} from "@core/types/event-color.contracts";
import { type RecurrenceScope } from "@core/types/event-command.contracts";
import dayjs from "@core/util/date/dayjs";
import { CompassEventRRule } from "@core/util/event/compass.event.rrule";
import { type GridEvent } from "@web/common/types/web.event.types";
import { getBrowserTimeZone } from "@web/common/utils/datetime/web.date.util";
import { gridEventDefaultPosition } from "@web/common/utils/event/event.util";
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
      location: "",
      schedule,
      calendarId,
      color: null,
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
      ...editableDetailsFromEvent(event),
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
//
// Series bases keep their RRULE on duplicate (legacy MapEvent.removeProviderData
// behavior). Occurrences become standalone — they only carry a seriesId link,
// not a rule of their own.
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
      ...editableDetailsFromEvent(event),
      schedule,
      calendarId,
      recurrence:
        event.recurrence.kind === "series"
          ? { kind: "series", rules: [...event.recurrence.rules] }
          : { kind: "single" },
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

/**
 * Direct GridEventDraft → GridEvent for the draft render hot path.
 * Avoids the CompassEvent bridge (`gridEventDraftToSchemaEvent`); overlays /
 * Day placeholders that still need CompassEvent keep that helper separately.
 */
export function gridEventDraftToGridEvent(draft: GridEventDraft): GridEvent {
  const { schedule } = draft.values;
  const color = draft.values.color ?? undefined;
  const isAllDay = schedule.kind === "allDay";

  return {
    _id: getGridDraftId(draft)!,
    title: draft.values.title,
    description: draft.values.description,
    origin: Origin.COMPASS,
    user: "",
    isAllDay,
    startDate: isAllDay
      ? toDateOnlyString(schedule.start)
      : dayjs(schedule.start).format(),
    endDate: isAllDay
      ? toDateOnlyString(schedule.end)
      : dayjs(schedule.end).format(),
    recurrence: legacyRecurrenceFromDraft(draft),
    position: gridEventDefaultPosition,
    calendarId: draft.values.calendarId ?? undefined,
    isBusy: draft.kind === "edit" && draft.source.content.kind === "busy",
    ...withColor(color),
  };
}

// Converts a grid draft to the CompassEvent-shaped view used by schema
// overlays, Day placeholders, and context-menu props. calendarId/isBusy/color
// are widened onto the return (rather than adding them to the shared core
// CompassEvent interface) so colored accents, the busy read-only gate, and
// per-event fill stay correct without a second lookup.
export function gridEventDraftToSchemaEvent(
  draft: GridEventDraft,
  seriesRules?: readonly string[],
): CompassEvent & {
  calendarId?: CalendarId;
  isBusy?: boolean;
  color?: EventColorSlot;
} {
  const { schedule } = draft.values;
  const color = draft.values.color ?? undefined;

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
    ...withColor(color),
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

export function scheduleDatesFromDraft(draft: GridEventDraft) {
  const { schedule } = draft.values;

  if (schedule.kind === "allDay") {
    return {
      startDate: dayjs(schedule.start).toYearMonthDayString(),
      endDate: dayjs(schedule.end).toYearMonthDayString(),
    };
  }

  return {
    startDate:
      dayjs(schedule.start).format() || dayjs().toRFC3339OffsetString(),
    endDate:
      dayjs(schedule.end).format() ||
      dayjs().add(1, "hour").toRFC3339OffsetString(),
  };
}

const weekdayNumber = (day: number | Weekday): number =>
  typeof day === "number" ? day : day.weekday;

const sortedByweekday = (
  byweekday: Array<number | Weekday> | null | undefined,
): number[] => (byweekday ?? []).map(weekdayNumber).sort((a, b) => a - b);

const normalizedCount = (count: number | null | undefined): number | null =>
  count == null || count === 0 ? null : count;

const untilEqual = (a: Date | null | undefined, b: Date | null | undefined) => {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return dayjs(a).isSame(b);
};

// Pattern-only RRULE equality for open-for-edit / patch: ignore serialization
// drift (INTERVAL=1, WKST defaults, param/BYDAY order) and never treat the
// occurrence's clicked dtstart as a recurrence edit.
export function recurrenceRulesSemanticallyEqual(
  a: readonly string[],
  b: readonly string[],
  dates: { startDate: string; endDate: string },
): boolean {
  if (a.length === 0 && b.length === 0) return true;
  if (a.length === 0 || b.length === 0) return false;

  const shell = {
    _id: new ObjectId(),
    startDate: dates.startDate,
    endDate: dates.endDate,
  };
  const optsA = new CompassEventRRule({
    ...shell,
    recurrence: { rule: [...a] },
  }).options;
  const optsB = new CompassEventRRule({
    ...shell,
    recurrence: { rule: [...b] },
  }).options;

  return (
    optsA.freq === optsB.freq &&
    (optsA.interval ?? 1) === (optsB.interval ?? 1) &&
    byweekdayEqual(optsA.byweekday, optsB.byweekday) &&
    normalizedCount(optsA.count) === normalizedCount(optsB.count) &&
    untilEqual(optsA.until, optsB.until)
  );
}

function byweekdayEqual(
  a: Array<number | Weekday> | null | undefined,
  b: Array<number | Weekday> | null | undefined,
): boolean {
  const left = sortedByweekday(a);
  const right = sortedByweekday(b);
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

// The draft renders its own recurrence preview separately (Draft.tsx's
// getRecurringDraftPreviews), but the *saved* sibling occurrences of the
// series being edited still come through the normal week query and render
// on their own - unaffected by an in-progress edit to the shared rule. Once
// the user has actually changed the recurrence (weekdays, frequency, until,
// or cleared it), those siblings are stale: they reflect the rule as it
// stood before this edit, not the draft's live preview. This returns the
// series id whose OTHER occurrences should be hidden from the grid while
// that's true, so the draft's own previews are the only thing shown for the
// series - and null whenever recurrence hasn't been touched (the draft's
// "preserve" kind), so dragging/editing non-recurrence fields never hides
// anything.
export function suppressedSeriesIdForDraft(
  draft: GridEventDraft | null,
): string | null {
  if (!draft || draft.kind !== "edit") return null;
  if (draft.values.recurrence.kind === "preserve") return null;

  const { recurrence } = draft.source;
  if (recurrence.kind === "occurrence") return recurrence.seriesId;
  if (recurrence.kind === "series") return draft.source.id;
  return null;
}

export function patchGridDraftRecurrence(
  draft: GridEventDraft,
  nextRules: readonly string[],
  seriesRules?: readonly string[],
): GridEventDraft {
  const currentRules = resolveDraftRecurrenceRules(draft, seriesRules);
  const ruleUnchanged = recurrenceRulesSemanticallyEqual(
    currentRules,
    nextRules,
    scheduleDatesFromDraft(draft),
  );
  // Only useRecurrence calls this, and only with an explicit user edit (a
  // weekday/frequency/until change, or the Repeat toggle turned off) - a
  // draft that hasn't touched recurrence never reaches here, so it keeps
  // "preserve" from editGridEventDraft instead. Empty rules is therefore
  // always an explicit clear, on both create and edit drafts: "single",
  // never "preserve" (which for an edit draft would just resolve back to
  // the source event's original rules, making the Repeat toggle a no-op).
  const recurrence = ruleUnchanged
    ? draft.values.recurrence
    : nextRules.length > 0
      ? { kind: "series" as const, rules: [...nextRules] }
      : ({ kind: "single" } as const);

  // The two branches look identical, but each is required to keep
  // GridEventDraft's discriminated union narrowed (see
  // replaceGridDraftSchedule above) - `recurrence` can structurally carry
  // "preserve" here (from the ruleUnchanged passthrough on an edit draft),
  // which isn't assignable to a create draft's NewEventRecurrenceDraft.
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

  return { ...draft, values: { ...draft.values, recurrence } };
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
  patch: Partial<
    Pick<
      GridEventDraft["values"],
      "title" | "description" | "location" | "color"
    >
  >,
): GridEventDraft {
  // Branching on kind keeps create/edit values correlated with the
  // discriminant (a shared spread widens recurrence across both shapes).
  if (current.kind === "create") {
    return {
      ...current,
      values: applyDraftFieldPatch(current.values, patch),
    };
  }
  return {
    ...current,
    values: applyDraftFieldPatch(current.values, patch),
  };
}

const applyDraftFieldPatch = <
  T extends Pick<
    GridEventDraft["values"],
    "title" | "description" | "location" | "color"
  >,
>(
  values: T,
  patch: Partial<
    Pick<
      GridEventDraft["values"],
      "title" | "description" | "location" | "color"
    >
  >,
): T => ({
  ...values,
  ...(patch.title !== undefined ? { title: patch.title } : {}),
  ...(patch.description !== undefined
    ? { description: patch.description }
    : {}),
  ...(patch.location !== undefined ? { location: patch.location } : {}),
  ...(patch.color !== undefined ? { color: patch.color } : {}),
});

// Event["content"].location is nullable/optional (a provider-sourced event
// may never have set one, and older local records predate the field
// entirely), but every editable-content consumer (draft values, replay
// payloads sent to mutations.replace/create) needs a definite string. Shared
// so every read of a stored event's location defaults it the same way -
// also used by useUndoRedo.ts's replay/comparison paths.
export const detailsLocation = (
  content: Extract<Event["content"], { kind: "details" }>,
): string => content.location ?? "";

// The write contracts (CreateEventInputSchema/ReplaceEventInputSchema) accept
// only the editable subset via a strict content schema; a read-shaped
// Event["content"] also carries provider-sourced organizer/attendees/
// conference/colorHex (added for the read side by #2555). A spread bypasses
// TypeScript's excess-property checks, so this runtime pick is the only thing
// that keeps a replayed/round-tripped event from failing that strict schema.
// Preserves color's absent-vs-null distinction: omitted leaves sync's color
// alone, null clears it (see EditableContentSchema's comment) - a spread of
// `color` would already do this correctly, this mirrors that.
export const editableContent = (
  content: Extract<Event["content"], { kind: "details" }>,
) => ({
  kind: "details" as const,
  title: content.title,
  description: content.description,
  location: detailsLocation(content),
  ...(content.color !== undefined ? { color: content.color } : {}),
});

const editableDetailsFromEvent = (
  event: Event,
): {
  title: string;
  description: string;
  location: string;
  color: EventColorSlot | null;
} => {
  if (event.content.kind !== "details") {
    return { title: "", description: "", location: "", color: null };
  }
  return {
    title: event.content.title,
    description: event.content.description,
    location: detailsLocation(event.content),
    color: event.content.color ?? null,
  };
};

// Local, not toISOString: all-day draft Dates are local midnight, so a UTC
// rendering would shift the day for any non-UTC viewer.
const toDateOnlyString = (date: Date) => dayjs(date).toYearMonthDayString();
