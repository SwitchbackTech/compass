import { type calendar_v3 } from "@googleapis/calendar";
import { ObjectId } from "mongodb";
import {
  type Calendar,
  CalendarAccessSchema,
  getCalendarCapabilities,
} from "@core/types/calendar.contracts";
import { type CalendarId, type TimeZone } from "@core/types/domain-primitives";
import { type CalendarRecord } from "@backend/calendar/calendar.record";

export const mapGoogleCalendar = (
  entry: calendar_v3.Schema$CalendarListEntry,
  context: {
    userId: ObjectId;
    existing?: Pick<CalendarRecord, "_id" | "isVisible">;
  },
): CalendarRecord => {
  if (!entry.id) {
    throw new Error("Google calendar entry is missing an id");
  }
  if (!entry.etag) {
    throw new Error("Google calendar entry is missing an etag");
  }

  const accessResult = CalendarAccessSchema.safeParse(entry.accessRole);
  if (!accessResult.success) {
    throw new Error(
      `Google calendar entry has an invalid accessRole: ${String(entry.accessRole)}`,
    );
  }

  return {
    _id: context.existing?._id ?? new ObjectId(),
    userId: context.userId,
    name: entry.summaryOverride ?? entry.summary ?? "",
    description: entry.description ?? "",
    timeZone: (entry.timeZone ?? null) as TimeZone | null,
    // Match the legacy Google calendar mapper's defaults (map.calendar.ts).
    backgroundColor: entry.backgroundColor ?? "#9e9e9e",
    foregroundColor: entry.foregroundColor ?? "#000000",
    access: accessResult.data,
    isPrimary: entry.primary ?? false,
    // Google's `selected` only seeds visibility on first insert; an existing
    // record's user-controlled visibility must never be overwritten by sync.
    isVisible: context.existing?.isVisible ?? entry.selected ?? true,
    isActive: true,
    source: {
      provider: "google",
      calendarId: entry.id,
      etag: entry.etag,
    },
    createdAt: new Date(),
    updatedAt: null,
  };
};

export const mapCalendarRecord = (record: CalendarRecord): Calendar => ({
  id: record._id.toHexString() as CalendarId,
  name: record.name,
  description: record.description,
  timeZone: record.timeZone,
  foregroundColor: record.foregroundColor,
  backgroundColor: record.backgroundColor,
  provider: record.source.provider,
  access: record.access,
  capabilities: getCalendarCapabilities(record.access),
  isPrimary: record.isPrimary,
  isVisible: record.isVisible,
  isActive: record.isActive,
});
