import z from "zod/v4";
import { Origin, Priorities } from "@core/constants/core.constants";
import { CalendarProvider } from "@core/types/event.types";
import { StringV4Schema, zObjectId } from "@core/types/type.utils";

export const GoogleStandaloneEventMetadataSchema = z.object({
  provider: z.literal(CalendarProvider.GOOGLE),
  gEventId: StringV4Schema,
});

export const GoogleRecurringEventMetadataSchema = z.object({
  ...GoogleStandaloneEventMetadataSchema.shape,
  gRecurringEventId: StringV4Schema,
});

// order matters: try to match recurring first
export const GoogleEventMetadataSchema = z.union([
  GoogleRecurringEventMetadataSchema,
  GoogleStandaloneEventMetadataSchema,
]);

export const CompassEventMetadataSchema = z.object({
  provider: z.literal(CalendarProvider.COMPASS),
});

export const EventMetadataSchema = z.union([
  GoogleEventMetadataSchema,
  CompassEventMetadataSchema,
]);

const RecurrenceBaseSchema = z.object({
  rule: z.array(StringV4Schema).nonempty(),
});

const RecurrenceInstanceSchema = z.object({
  ...RecurrenceBaseSchema.shape,
  eventId: zObjectId,
});

// order matters: try to match instance first
const RecurrenceSchema = z.union([
  RecurrenceInstanceSchema,
  RecurrenceBaseSchema,
]);

export const EventSchema = z.object({
  _id: zObjectId,
  calendar: zObjectId,
  title: StringV4Schema,
  description: z.string().default(""),
  isSomeday: z.boolean().default(false),
  startDate: z.date(),
  endDate: z.date(),
  origin: z.enum(Origin).default(Origin.COMPASS),
  priority: z.enum(Priorities).default(Priorities.UNASSIGNED),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().nullable().optional(),
  recurrence: RecurrenceSchema.nullable().optional(),
  metadata: z.array(EventMetadataSchema).nonempty(),
});

export type Schema_Event = z.infer<typeof EventSchema>;
