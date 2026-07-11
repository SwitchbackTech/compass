import { ObjectId } from "mongodb";
import { z } from "zod/v4";
import {
  type CalendarRecord,
  CalendarRecordSchema,
} from "@backend/calendar/calendar.record";

export type LegacyCalendarTransformReason =
  | "invalidShape"
  | "missingProviderIdentity";

export type LegacyCalendarTransformResult =
  | { ok: true; record: CalendarRecord }
  | {
      ok: false;
      legacyId: string | null;
      reason: LegacyCalendarTransformReason;
    };

const LegacyCalendarMetadataRawSchema = z.object({
  id: z.string().optional(),
  etag: z.string().optional(),
  summary: z.string().nullable().optional(),
  summaryOverride: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  accessRole: z.string().optional(),
});

// Lenient by design: legacy Google metadata carries many more fields
// (conferenceProperties, defaultReminders, ...) that the record shape has no
// use for; they are simply not declared here and get stripped.
const LegacyCalendarRawSchema = z.object({
  _id: z.union([z.instanceof(ObjectId), z.string()]).optional(),
  user: z.union([z.instanceof(ObjectId), z.string()]).optional(),
  backgroundColor: z.string().optional(),
  color: z.string().optional(),
  selected: z.boolean().optional(),
  primary: z.boolean().optional(),
  timezone: z.string().nullable().optional(),
  createdAt: z.union([z.date(), z.string()]).optional(),
  updatedAt: z.union([z.date(), z.string()]).nullable().optional(),
  metadata: LegacyCalendarMetadataRawSchema.optional(),
});

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

const toDateOrNull = (value: Date | string | null | undefined): Date | null => {
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
};

export const transformLegacyCalendar = (
  legacy: unknown,
): LegacyCalendarTransformResult => {
  const rawId = bestEffortLegacyId(legacy);
  const parsed = LegacyCalendarRawSchema.safeParse(legacy);
  if (!parsed.success)
    return { ok: false, legacyId: rawId, reason: "invalidShape" };
  const data = parsed.data;

  const _id = data._id === undefined ? null : toObjectId(data._id);
  const userId = data.user === undefined ? null : toObjectId(data.user);
  if (_id === null || userId === null) {
    return { ok: false, legacyId: rawId, reason: "invalidShape" };
  }
  const legacyId = _id.toHexString();

  const metadata = data.metadata;
  if (!metadata?.id || !metadata.etag) {
    return { ok: false, legacyId, reason: "missingProviderIdentity" };
  }

  const candidate = {
    _id,
    userId,
    name: metadata.summaryOverride ?? metadata.summary ?? "",
    description: metadata.description ?? "",
    timeZone: data.timezone ?? null,
    foregroundColor: data.color,
    backgroundColor: data.backgroundColor,
    access: metadata.accessRole,
    isPrimary: data.primary ?? false,
    isVisible: data.selected ?? true,
    isActive: true,
    source: {
      provider: "google" as const,
      calendarId: metadata.id,
      etag: metadata.etag,
    },
    createdAt: toDateOrNull(data.createdAt) ?? _id.getTimestamp(),
    updatedAt: toDateOrNull(data.updatedAt),
  };

  const result = CalendarRecordSchema.safeParse(candidate);
  if (!result.success) return { ok: false, legacyId, reason: "invalidShape" };
  return { ok: true, record: result.data };
};

// The per-user Compass-local calendar created once during migration; every
// user gets exactly one (enforced by the partial unique index from step 4).
export const buildLocalCalendarRecord = (
  userId: ObjectId,
  now: Date,
): CalendarRecord => {
  const candidate = {
    _id: new ObjectId(),
    userId,
    name: "Compass",
    description: "",
    timeZone: null,
    // Matches the repo's existing default calendar colors (map.calendar.ts,
    // calendar.record.mapper.ts): black foreground, neutral gray background.
    foregroundColor: "#000000",
    backgroundColor: "#9e9e9e",
    access: "owner" as const,
    isPrimary: false,
    isVisible: true,
    isActive: true,
    source: { provider: "local" as const },
    createdAt: now,
    updatedAt: null,
  };
  return CalendarRecordSchema.parse(candidate);
};
