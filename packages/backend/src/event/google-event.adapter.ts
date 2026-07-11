import { ObjectId } from "mongodb";
import { Priorities } from "@core/constants/core.constants";
import { type DateOnly, type TimeZone } from "@core/types/domain-primitives";
import { type EventContent } from "@core/types/event.contracts";
import {
  type EventRecord,
  type EventRecurrenceRecord,
  type EventScheduleRecord,
} from "@backend/event/event.record";
import {
  type GoogleEventInput,
  type GoogleEventMapResult,
  type GoogleEventWriteInput,
} from "@backend/event/google-event-adapter.types";

const parseDateOnly = (value: string | null | undefined): string | null => {
  if (!value) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
};

const addOneDay = (dateOnly: string): string => {
  const date = new Date(`${dateOnly}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
};

const parseInstant = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

type ScheduleMapResult =
  | { kind: "ok"; schedule: EventScheduleRecord }
  | { kind: "invalid" };

const mapSchedule = (
  event: GoogleEventInput,
  calendarTimeZone: string | null,
): ScheduleMapResult => {
  const startDateOnly = parseDateOnly(event.start?.date);
  if (startDateOnly) {
    const endDateOnlyRaw = parseDateOnly(event.end?.date);
    // Google's end.date is already exclusive; a missing or same-day end
    // means a one-day event, so advance it to the next day ourselves.
    const endDateOnly =
      !endDateOnlyRaw || endDateOnlyRaw === startDateOnly
        ? addOneDay(startDateOnly)
        : endDateOnlyRaw;
    return {
      kind: "ok",
      schedule: {
        kind: "allDay",
        start: startDateOnly as DateOnly,
        end: endDateOnly as DateOnly,
      },
    };
  }

  const startInstant = parseInstant(event.start?.dateTime);
  if (startInstant) {
    const endInstant = parseInstant(event.end?.dateTime);
    if (!endInstant) return { kind: "invalid" };

    const timeZone = event.start?.timeZone ?? calendarTimeZone ?? "UTC";
    return {
      kind: "ok",
      schedule: {
        kind: "timed",
        start: startInstant,
        end: endInstant,
        timeZone: timeZone as TimeZone,
      },
    };
  }

  return { kind: "invalid" };
};

type RecurrenceMapResult =
  | { kind: "ok"; recurrence: EventRecurrenceRecord }
  | { kind: "invalid" };

const mapRecurrence = (
  event: GoogleEventInput,
  resolveSeriesObjectId: (gRecurringEventId: string) => ObjectId | undefined,
): RecurrenceMapResult => {
  const hasRules =
    Array.isArray(event.recurrence) && event.recurrence.length > 0;
  const hasRecurringEventId = Boolean(event.recurringEventId);

  if (hasRules && hasRecurringEventId) return { kind: "invalid" };

  if (hasRules) {
    return {
      kind: "ok",
      recurrence: { kind: "series", rules: event.recurrence as string[] },
    };
  }

  if (hasRecurringEventId) {
    const seriesId = resolveSeriesObjectId(event.recurringEventId as string);
    if (!seriesId) return { kind: "invalid" };
    return { kind: "ok", recurrence: { kind: "occurrence", seriesId } };
  }

  return { kind: "ok", recurrence: { kind: "single" } };
};

const mapContent = (event: GoogleEventInput): EventContent => {
  // Google omits `summary` and `creator` entirely (not just leaves them
  // undefined) on events whose private details are withheld from a reader;
  // that specific combination is the only reliable "busy" signal.
  if (!("summary" in event) && !("creator" in event)) {
    return { kind: "busy" };
  }
  return {
    kind: "details",
    title: event.summary ?? "",
    description: event.description ?? "",
  };
};

export const mapGoogleEvent = (
  event: GoogleEventInput,
  context: {
    calendarId: ObjectId;
    calendarTimeZone: string | null;
    resolveSeriesObjectId: (gRecurringEventId: string) => ObjectId | undefined;
    now: Date;
  },
): GoogleEventMapResult => {
  if (!event.id) {
    return { kind: "invalid", reason: "missingId" };
  }

  if (event.status === "cancelled") {
    return {
      kind: "cancelled",
      providerEventId: event.id,
      providerRecurringEventId: event.recurringEventId ?? null,
    };
  }

  if (event.eventType && event.eventType !== "default") {
    return { kind: "ignored", reason: "unsupportedType" };
  }

  const scheduleResult = mapSchedule(event, context.calendarTimeZone);
  if (scheduleResult.kind === "invalid") {
    return { kind: "invalid", reason: "missingDates" };
  }

  const recurrenceResult = mapRecurrence(event, context.resolveSeriesObjectId);
  if (recurrenceResult.kind === "invalid") {
    return { kind: "invalid", reason: "invalidRecurrence" };
  }

  const record: EventRecord = {
    _id: new ObjectId(),
    calendarId: context.calendarId,
    content: mapContent(event),
    schedule: scheduleResult.schedule,
    recurrence: recurrenceResult.recurrence,
    priority: Priorities.UNASSIGNED,
    externalReference: {
      provider: "google",
      eventId: event.id,
      recurringEventId: event.recurringEventId ?? null,
    },
    createdAt: event.created ? new Date(event.created) : context.now,
    updatedAt: event.updated ? new Date(event.updated) : null,
  };

  return { kind: "mapped", event: record };
};

export const mapEventRecordToGoogle = (
  record: EventRecord,
): GoogleEventWriteInput => {
  if (record.content.kind !== "details") {
    // Programmer error: busy content is a reader-only privacy placeholder
    // and is never written back to Google.
    throw new Error("Cannot write busy-content event to Google");
  }
  if (record.schedule.kind === "someday") {
    // Programmer error: someday events live on the Compass-local calendar
    // and never reach a Google-backed calendar's write path.
    throw new Error("Cannot write a someday-scheduled event to Google");
  }

  const scheduleFields: Pick<GoogleEventWriteInput, "start" | "end"> =
    record.schedule.kind === "timed"
      ? {
          start: {
            dateTime: record.schedule.start.toISOString(),
            timeZone: record.schedule.timeZone,
          },
          end: {
            dateTime: record.schedule.end.toISOString(),
            timeZone: record.schedule.timeZone,
          },
        }
      : {
          start: { date: record.schedule.start },
          end: { date: record.schedule.end },
        };

  return {
    summary: record.content.title,
    description: record.content.description,
    ...scheduleFields,
    // events.patch merges by key: an omitted key is left unchanged on
    // Google, while an explicit null clears it. A series-to-single edit
    // must send `recurrence: null` to clear the stale rules on Google.
    recurrence:
      record.recurrence.kind === "series" ? [...record.recurrence.rules] : null,
  };
};
