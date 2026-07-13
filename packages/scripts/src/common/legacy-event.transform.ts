import { ObjectId } from "mongodb";
import { z } from "zod/v4";
import { Priorities } from "@core/constants/core.constants";
import { PrioritySchema } from "@core/types/domain-primitives";
import {
  type EventRecord,
  EventRecordSchema,
  type EventRecurrenceRecord,
  type ExternalEventReference,
} from "@backend/event/event.record";

export type LegacyEventTransformContext = {
  localCalendarId: ObjectId;
  primaryGoogleCalendar: { id: ObjectId; timeZone: string | null } | null;
  // Migration supplies this from a bounded lookup over the LEGACY collection.
  legacyBaseEventExists: (legacyBaseId: string) => boolean;
};

export type LegacyEventTransformReason =
  | "invalidShape"
  | "flagDateMismatch"
  | "invalidDates"
  | "recurrenceConflict"
  | "emptyRecurrenceRules"
  | "missingRecurrenceBase"
  | "invalidObjectId"
  | "missingPrimaryGoogleCalendar";

export type LegacyEventTransformResult =
  | {
      ok: true;
      record: EventRecord;
      timeZoneSource: "calendar" | "utcFallback" | null;
    }
  | { ok: false; legacyId: string | null; reason: LegacyEventTransformReason }
  // Legacy someday events are intentionally excluded from the sub-calendar
  // backfill: the Someday feature was removed, so these records are counted
  // and dropped rather than migrated. Distinct from a failure so the backfill
  // stays fail-closed on genuinely unexpected records.
  | { ok: false; excluded: true; legacyId: string };

type FailResult = Extract<
  LegacyEventTransformResult,
  { ok: false; reason: LegacyEventTransformReason }
>;

const LegacyRecurrenceRawSchema = z.object({
  rule: z.array(z.string()).nullable().optional(),
  eventId: z.string().optional(),
});

// Lenient by design: unknown legacy keys (order, allDayOrder, origin,
// priorities, ...) are simply not declared here, so zod's default "strip"
// behavior drops them without erroring.
const LegacyEventRawSchema = z.object({
  _id: z.union([z.instanceof(ObjectId), z.string()]).optional(),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  isAllDay: z.boolean().optional(),
  isSomeday: z.boolean().optional(),
  gEventId: z.string().optional(),
  gRecurringEventId: z.string().optional(),
  order: z.number().optional(),
  priority: z.string().optional(),
  recurrence: LegacyRecurrenceRawSchema.optional(),
  updatedAt: z.union([z.date(), z.string()]).optional(),
});

type LegacyEventRaw = z.infer<typeof LegacyEventRawSchema>;

type DateShape = "dateOnly" | "offset" | "invalid";

const shapeOf = (value: string): DateShape => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))) {
    return "dateOnly";
  }
  if (z.iso.datetime({ offset: true }).safeParse(value).success) {
    return "offset";
  }
  return "invalid";
};

// Exclusive-end +1 day computed in UTC so DST transitions in the reader's
// local zone can never shift the date string.
const addOneUtcDay = (dateOnly: string): string => {
  const parts = dateOnly.split("-").map(Number);
  const [year, month, day] = parts as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day + 1))
    .toISOString()
    .slice(0, 10);
};

const toObjectId = (value: ObjectId | string): ObjectId | null => {
  if (value instanceof ObjectId) return value;
  return ObjectId.isValid(value) ? new ObjectId(value) : null;
};

const bestEffortLegacyId = (legacy: unknown): string | null => {
  if (typeof legacy !== "object" || legacy === null || !("_id" in legacy)) {
    return null;
  }
  const id = (legacy as { _id: unknown })._id;
  if (id instanceof ObjectId) return id.toHexString();
  if (typeof id === "string") return id;
  return null;
};

const fail = (
  legacyId: string | null,
  reason: LegacyEventTransformReason,
): FailResult => ({ ok: false, legacyId, reason });

const resolvePriority = (priority: string | undefined) => {
  const result = PrioritySchema.safeParse(priority);
  return result.success ? result.data : Priorities.UNASSIGNED;
};

const resolveExternalReference = (
  data: LegacyEventRaw,
): ExternalEventReference | null => {
  if (!data.gEventId) return null;
  return {
    provider: "google",
    eventId: data.gEventId,
    recurringEventId: data.gRecurringEventId ?? null,
  };
};

const resolveUpdatedAt = (value: Date | string | undefined): Date | null => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
};

const buildContent = (data: LegacyEventRaw) => ({
  kind: "details" as const,
  title: data.title ?? "",
  description: data.description ?? "",
});

const resolveCalendarId = (
  data: LegacyEventRaw,
  context: LegacyEventTransformContext,
):
  | { ok: true; calendarId: ObjectId }
  | { ok: false; reason: LegacyEventTransformReason } => {
  if (data.gEventId) {
    if (!context.primaryGoogleCalendar) {
      return { ok: false, reason: "missingPrimaryGoogleCalendar" };
    }
    return { ok: true, calendarId: context.primaryGoogleCalendar.id };
  }
  if (context.primaryGoogleCalendar) {
    return { ok: true, calendarId: context.primaryGoogleCalendar.id };
  }
  return { ok: true, calendarId: context.localCalendarId };
};

const resolveRecurrence = (
  data: LegacyEventRaw,
  legacyId: string,
  context: LegacyEventTransformContext,
): { ok: true; recurrence: EventRecurrenceRecord } | FailResult => {
  const rec = data.recurrence;
  if (!rec) return { ok: true, recurrence: { kind: "single" } };

  const ruleGiven = Array.isArray(rec.rule) && rec.rule.length > 0;
  const ruleEmpty = Array.isArray(rec.rule) && rec.rule.length === 0;
  const eventIdGiven =
    typeof rec.eventId === "string" && rec.eventId.length > 0;

  if (ruleGiven && eventIdGiven) return fail(legacyId, "recurrenceConflict");
  if (ruleEmpty) return fail(legacyId, "emptyRecurrenceRules");
  if (ruleGiven) {
    return { ok: true, recurrence: { kind: "series", rules: rec.rule! } };
  }
  if (eventIdGiven) {
    const seriesId = toObjectId(rec.eventId!);
    if (!seriesId) return fail(legacyId, "invalidObjectId");
    if (!context.legacyBaseEventExists(rec.eventId!)) {
      return fail(legacyId, "missingRecurrenceBase");
    }
    return { ok: true, recurrence: { kind: "occurrence", seriesId } };
  }
  // recurrence object present but with neither field set (e.g. { rule: null })
  // carries no recurrence information, same as an absent recurrence field.
  return { ok: true, recurrence: { kind: "single" } };
};

const finalize = (
  candidate: unknown,
  legacyId: string,
  timeZoneSource: "calendar" | "utcFallback" | null,
): LegacyEventTransformResult => {
  const parsed = EventRecordSchema.safeParse(candidate);
  if (!parsed.success) return fail(legacyId, "invalidShape");
  return {
    ok: true,
    record: parsed.data,
    timeZoneSource,
  };
};

const buildTimed = (
  data: LegacyEventRaw,
  _id: ObjectId,
  legacyId: string,
  context: LegacyEventTransformContext,
): LegacyEventTransformResult => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return fail(legacyId, "invalidDates");
  }
  if (end.getTime() <= start.getTime()) return fail(legacyId, "invalidDates");

  const calendarResult = resolveCalendarId(data, context);
  if (!calendarResult.ok) return fail(legacyId, calendarResult.reason);

  const recurrenceResult = resolveRecurrence(data, legacyId, context);
  if (!recurrenceResult.ok) return recurrenceResult;

  // A26 ladder: Google event and connected-user local event both resolve to
  // the single primary Google calendar's zone; only a disconnected user
  // falls back to UTC.
  const calendarTimeZone = context.primaryGoogleCalendar?.timeZone ?? null;
  const timeZoneSource: "calendar" | "utcFallback" = calendarTimeZone
    ? "calendar"
    : "utcFallback";

  const candidate = {
    _id,
    calendarId: calendarResult.calendarId,
    content: buildContent(data),
    schedule: {
      kind: "timed" as const,
      start,
      end,
      timeZone: calendarTimeZone ?? "UTC",
    },
    recurrence: recurrenceResult.recurrence,
    priority: resolvePriority(data.priority),
    externalReference: resolveExternalReference(data),
    createdAt: _id.getTimestamp(),
    updatedAt: resolveUpdatedAt(data.updatedAt),
  };

  return finalize(candidate, legacyId, timeZoneSource);
};

const buildAllDay = (
  data: LegacyEventRaw,
  _id: ObjectId,
  legacyId: string,
  context: LegacyEventTransformContext,
): LegacyEventTransformResult => {
  let end = data.endDate;
  if (data.endDate === data.startDate) {
    end = addOneUtcDay(data.startDate);
  } else if (data.endDate < data.startDate) {
    return fail(legacyId, "invalidDates");
  }

  const calendarResult = resolveCalendarId(data, context);
  if (!calendarResult.ok) return fail(legacyId, calendarResult.reason);

  const recurrenceResult = resolveRecurrence(data, legacyId, context);
  if (!recurrenceResult.ok) return recurrenceResult;

  const candidate = {
    _id,
    calendarId: calendarResult.calendarId,
    content: buildContent(data),
    schedule: { kind: "allDay" as const, start: data.startDate, end },
    recurrence: recurrenceResult.recurrence,
    priority: resolvePriority(data.priority),
    externalReference: resolveExternalReference(data),
    createdAt: _id.getTimestamp(),
    updatedAt: resolveUpdatedAt(data.updatedAt),
  };

  return finalize(candidate, legacyId, null);
};

export const transformLegacyEvent = (
  legacy: unknown,
  context: LegacyEventTransformContext,
): LegacyEventTransformResult => {
  const rawId = bestEffortLegacyId(legacy);
  const parsed = LegacyEventRawSchema.safeParse(legacy);
  if (!parsed.success) return fail(rawId, "invalidShape");
  const data = parsed.data;

  const _id = data._id === undefined ? null : toObjectId(data._id);
  if (_id === null) return fail(rawId, "invalidShape");
  const legacyId = _id.toHexString();

  // Legacy someday events are not migrated into the sub-calendar model; they
  // are excluded (and counted by callers) instead. The Someday feature was
  // removed, so there is no destination schedule for them.
  if (data.isSomeday === true) {
    return { ok: false, excluded: true, legacyId };
  }

  const startShape = shapeOf(data.startDate);
  const endShape = shapeOf(data.endDate);
  if (startShape === "invalid" || endShape === "invalid") {
    return fail(legacyId, "invalidDates");
  }
  // One date-only, one offset instant: shape itself is ambiguous regardless
  // of the isAllDay flag.
  if (startShape !== endShape) return fail(legacyId, "flagDateMismatch");
  // Explicit flag contradicts the date shape it was paired with.
  if (data.isAllDay === true && startShape === "offset") {
    return fail(legacyId, "flagDateMismatch");
  }
  if (data.isAllDay === false && startShape === "dateOnly") {
    return fail(legacyId, "flagDateMismatch");
  }

  if (startShape === "dateOnly") {
    return buildAllDay(data, _id, legacyId, context);
  }
  return buildTimed(data, _id, legacyId, context);
};
