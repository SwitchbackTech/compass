import { Priorities } from "@core/constants/core.constants";
import { type CalendarId } from "@core/types/domain-primitives";
import { type Event } from "@core/types/event.contracts";
import {
  type RecurrenceScope,
  type TransitionEventInput,
  TransitionEventInputSchema,
} from "@core/types/event-command.contracts";
import dayjs from "@core/util/date/dayjs";
import { getBrowserTimeZone } from "@web/common/utils/datetime/web.date.util";
import {
  type EditEventDraft,
  type NewEventDraft,
} from "@web/events/event-draft.types";

// Mirrors grid-event-draft.adapter.ts's createGridEventDraft/
// duplicateGridEventDraft, but for someday drafts, which use the generic
// EventDraft/EventScheduleDraft ("someday" is a variant GridScheduleDraft
// deliberately excludes). calendarId starts null: someday events aren't
// calendar-scoped by the user until the call site resolves a default target
// calendar, mirroring how a blank grid draft starts with no calendar picked.
export function createSomedayEventDraft(
  category: "week" | "month",
  anchorDate: Date,
  sortOrder: number,
): NewEventDraft {
  return {
    mode: "create",
    isDirty: true,
    submitError: null,
    values: {
      title: "",
      description: "",
      schedule: { kind: "someday", period: category, anchorDate, sortOrder },
      priority: Priorities.UNASSIGNED,
      calendarId: null,
      recurrence: { kind: "single" },
    },
  };
}

// A duplicate is a brand-new, standalone event: it starts from the source
// event's fields but is never linked back to it (mode "create"), so
// editing/deleting the duplicate never touches the original. Returns null for
// a non-someday source, mirroring duplicateGridEventDraft's null-return guard.
export function duplicateSomedayEventDraft(event: Event): NewEventDraft | null {
  const { schedule } = event;
  if (schedule.kind !== "someday") return null;

  return {
    mode: "create",
    isDirty: true,
    submitError: null,
    values: {
      title: event.content.kind === "details" ? event.content.title : "",
      description:
        event.content.kind === "details" ? event.content.description : "",
      schedule: {
        kind: "someday",
        period: schedule.period,
        // dayjs(...), not new Date(...): a bare "YYYY-MM-DD" string parses
        // as UTC midnight via the Date constructor, which reads back as the
        // previous local day in a negative-UTC-offset zone once
        // parseEventDraft reformats it - see editSomedayEventDraft's note.
        anchorDate: dayjs(schedule.anchorDate).toDate(),
        sortOrder: schedule.sortOrder,
      },
      priority: event.priority,
      calendarId: null,
      recurrence: { kind: "single" },
    },
  };
}

// Mirrors editGridEventDraft, but for someday drafts. "preserve" is the
// baseline recurrence (matches editGridEventDraft's default); call sites
// that submit an explicit recurrence change (e.g. the someday form's rule
// editor) overwrite `values.recurrence` before parsing. Returns null for a
// non-someday source, mirroring editGridEventDraft's null-return guard.
export function editSomedayEventDraft(
  event: Event,
  scope: RecurrenceScope = "this",
): EditEventDraft | null {
  const { schedule } = event;
  if (schedule.kind !== "someday") return null;

  return {
    mode: "edit",
    eventId: event.id,
    originalCalendarId: event.calendarId,
    isDirty: true,
    submitError: null,
    values: {
      title: event.content.kind === "details" ? event.content.title : "",
      description:
        event.content.kind === "details" ? event.content.description : "",
      schedule: {
        kind: "someday",
        period: schedule.period,
        // `new Date("YYYY-MM-DD")` parses as UTC midnight; in a negative
        // UTC-offset zone that reads back as the previous local day once
        // parseEventDraft's toDateOnlyString reformats it, silently shifting
        // the event into the prior week/month's bucket. dayjs(...) parses a
        // bare date-only string as local midnight instead.
        anchorDate: dayjs(schedule.anchorDate).toDate(),
        sortOrder: schedule.sortOrder,
      },
      priority: event.priority,
      calendarId: event.calendarId,
      recurrence: { kind: "preserve" },
      scope,
    },
  };
}

// Shifts an existing edit draft's someday schedule (period/anchorDate/
// sortOrder) for the migrate forward/back/up/down flows, keeping every other
// field (title, description, recurrence, scope) untouched. Mirrors
// replaceGridDraftSchedule's spread-and-override shape.
export function retargetSomedayEventDraft(
  draft: EditEventDraft,
  schedule: { period: "week" | "month"; anchorDate: Date; sortOrder: number },
): EditEventDraft {
  return {
    ...draft,
    values: { ...draft.values, schedule: { kind: "someday", ...schedule } },
  };
}

// Builds the TransitionEventInput for dragging/shortcutting a someday event
// onto the calendar grid. Mirrors schemaEventToCreateInput/
// schemaEventToReplaceInput's safeParse-and-return-null-on-failure shape
// (event.legacy-bridge.ts) so a malformed drop never reaches the mutation
// layer. `dates` are already local-zone strings from the drop/shortcut call
// site (YYYY-MM-DD for all-day, full offset-ISO for timed) - see
// SomedayInteractionAdapter's schedule-drop construction.
export function scheduleSomedayEventTransition(
  dates: { startDate: string; endDate: string },
  isAllDay: boolean,
  targetCalendarId: CalendarId,
): TransitionEventInput | null {
  const schedule = isAllDay
    ? { kind: "allDay" as const, start: dates.startDate, end: dates.endDate }
    : {
        kind: "timed" as const,
        start: dates.startDate,
        end: dates.endDate,
        timeZone: getBrowserTimeZone(),
      };

  const parsed = TransitionEventInputSchema.safeParse({
    kind: "schedule",
    targetCalendarId,
    schedule,
  });

  return parsed.success ? parsed.data : null;
}
