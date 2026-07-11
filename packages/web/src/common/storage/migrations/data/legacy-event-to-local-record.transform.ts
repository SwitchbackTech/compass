import { ObjectId } from "bson";
import { Priorities } from "@core/constants/core.constants";
import { type CalendarId, EventIdSchema } from "@core/types/domain-primitives";
import { type EventRecurrence } from "@core/types/event.contracts";
import { type Event_Core } from "@core/types/event.types";
import {
  type LocalEventRecord,
  LocalEventRecordSchema,
} from "@web/common/storage/types/local-event.record";
import { getBrowserTimeZone } from "@web/common/utils/datetime/web.date.util";
import { createObjectIdString } from "@web/common/utils/id/object-id.util";

/** Web-side mirror of `__compassDemoEvent` on legacy local-store rows. */
const LEGACY_DEMO_EVENT_FIELD = "__compassDemoEvent";

type LegacyLocalEvent = Event_Core & {
  [LEGACY_DEMO_EVENT_FIELD]?: true;
  order?: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function toDateOnly(value: string): string {
  return value.slice(0, 10);
}

const isValidLegacyOrder = (order: unknown): order is number =>
  typeof order === "number" && Number.isInteger(order) && order >= 0;

function resolveRecurrence(legacy: LegacyLocalEvent): EventRecurrence {
  const rec = legacy.recurrence;
  if (!rec) return { kind: "single" };

  if (Array.isArray(rec.rule) && rec.rule.length > 0) {
    return { kind: "series", rules: rec.rule };
  }

  if (typeof rec.eventId === "string" && rec.eventId.length > 0) {
    const parsed = EventIdSchema.safeParse(rec.eventId);
    if (parsed.success) {
      return { kind: "occurrence", seriesId: parsed.data };
    }
  }

  return { kind: "single" };
}

type ScheduleCandidate =
  | { kind: "timed"; start: string; end: string; timeZone: string }
  | { kind: "allDay"; start: string; end: string }
  | {
      kind: "someday";
      period: "week" | "month";
      anchorDate: string;
      sortOrder: number;
    };

function resolveSchedule(legacy: LegacyLocalEvent): ScheduleCandidate | null {
  const { startDate, endDate } = legacy;
  if (!startDate || !endDate) return null;

  if (legacy.isSomeday) {
    const startMs = Date.parse(startDate);
    const endMs = Date.parse(endDate);
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) return null;

    const diffDays = (endMs - startMs) / DAY_MS;
    const period: "week" | "month" = diffDays > 7 ? "month" : "week";
    const anchorDate = toDateOnly(startDate);

    return {
      kind: "someday",
      period,
      anchorDate,
      // A deterministic append pass fixes up records missing an explicit
      // legacy order after this first build; see assignMissingSortOrders.
      sortOrder: isValidLegacyOrder(legacy.order) ? legacy.order : 0,
    };
  }

  if (legacy.isAllDay) {
    let end = toDateOnly(endDate);
    const start = toDateOnly(startDate);
    if (end === start) {
      end = new Date(Date.parse(start) + DAY_MS).toISOString().slice(0, 10);
    }
    return { kind: "allDay", start, end };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }
  if (end.getTime() <= start.getTime()) return null;

  return {
    kind: "timed",
    start: start.toISOString(),
    end: end.toISOString(),
    timeZone: getBrowserTimeZone(),
  };
}

function resolveCreatedAt(id: string): string {
  try {
    return new ObjectId(id).getTimestamp().toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function resolveUpdatedAt(legacy: LegacyLocalEvent): string | null {
  if (!legacy.updatedAt) return null;
  const date =
    legacy.updatedAt instanceof Date
      ? legacy.updatedAt
      : new Date(legacy.updatedAt);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Transforms one legacy local-store event row into a `LocalEventRecord`
 * (B13). Returns null when the row cannot be reasonably interpreted (missing
 * or unparseable dates) — the caller drops these rather than failing the
 * whole migration.
 */
export function transformLegacyEventToLocalRecord(
  legacy: LegacyLocalEvent,
  sentinelCalendarId: CalendarId,
): LocalEventRecord | null {
  const schedule = resolveSchedule(legacy);
  if (!schedule) return null;

  const id = EventIdSchema.safeParse(legacy._id ?? createObjectIdString());
  if (!id.success) return null;

  const candidate = {
    version: 2 as const,
    id: id.data,
    event: {
      id: id.data,
      calendarId: sentinelCalendarId,
      content: {
        kind: "details" as const,
        title: legacy.title ?? "",
        description: legacy.description ?? "",
      },
      schedule,
      recurrence: resolveRecurrence(legacy),
      priority: legacy.priority ?? Priorities.UNASSIGNED,
      createdAt: resolveCreatedAt(id.data),
      updatedAt: resolveUpdatedAt(legacy),
    },
    isDemo: legacy[LEGACY_DEMO_EVENT_FIELD] === true,
  };

  const parsed = LocalEventRecordSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

/**
 * Transforms a batch of legacy rows, then deterministically assigns
 * `sortOrder` to someday events that had no valid legacy `order` — appended
 * after the bucket's max, ordered by legacy startDate then id, bucketed by
 * (period, anchorDate). Mirrors the scripts-side
 * `assignMissingSomedaySortOrders` transform used for the backend migration.
 */
export function transformLegacyEvents(
  legacyEvents: LegacyLocalEvent[],
  sentinelCalendarId: CalendarId,
): LocalEventRecord[] {
  const withLegacy = legacyEvents
    .map((legacy) => ({
      legacy,
      record: transformLegacyEventToLocalRecord(legacy, sentinelCalendarId),
    }))
    .filter(
      (item): item is { legacy: LegacyLocalEvent; record: LocalEventRecord } =>
        item.record !== null,
    );

  const maxByBucket = new Map<string, number>();
  const flaggedByBucket = new Map<
    string,
    { legacy: LegacyLocalEvent; record: LocalEventRecord }[]
  >();

  for (const item of withLegacy) {
    const { schedule } = item.record.event;
    if (schedule.kind !== "someday") continue;

    const key = `${schedule.period}:${schedule.anchorDate}`;

    if (isValidLegacyOrder(item.legacy.order)) {
      maxByBucket.set(
        key,
        Math.max(maxByBucket.get(key) ?? -1, schedule.sortOrder),
      );
    } else {
      const bucket = flaggedByBucket.get(key) ?? [];
      bucket.push(item);
      flaggedByBucket.set(key, bucket);
    }
  }

  for (const [key, bucket] of flaggedByBucket) {
    bucket.sort((a, b) => {
      const dateCompare = (a.legacy.startDate ?? "").localeCompare(
        b.legacy.startDate ?? "",
      );
      if (dateCompare !== 0) return dateCompare;
      return a.record.id.localeCompare(b.record.id);
    });

    let next = (maxByBucket.get(key) ?? -1) + 1;
    for (const item of bucket) {
      const { schedule } = item.record.event;
      if (schedule.kind !== "someday") continue;
      schedule.sortOrder = next;
      next += 1;
    }
  }

  return withLegacy.map((item) => item.record);
}
