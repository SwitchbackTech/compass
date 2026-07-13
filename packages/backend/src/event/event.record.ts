import { z } from "zod/v4";
import {
  DateOnlySchema,
  PrioritySchema,
  RRuleSchema,
  TimeZoneSchema,
} from "@core/types/domain-primitives";
import { EventContentSchema } from "@core/types/event.contracts";
import { zObjectId } from "@core/types/type.utils";

// See calendar.record.ts: zObjectId, not z.instanceof(ObjectId), so the
// derived $jsonSchema keeps bsonType "objectId". Refinements (end > start) do
// not survive into $jsonSchema either; the Mongo validator enforces structure
// only, and cross-field ordering stays an application-level parse.
const ObjectIdSchema = zObjectId;

const TimedScheduleRecordSchema = z
  .strictObject({
    kind: z.literal("timed"),
    start: z.date(),
    end: z.date(),
    timeZone: TimeZoneSchema,
  })
  .refine(({ start, end }) => end.getTime() > start.getTime(), {
    message: "Timed event end must be after start",
    path: ["end"],
  });

const AllDayScheduleRecordSchema = z
  .strictObject({
    kind: z.literal("allDay"),
    start: DateOnlySchema,
    end: DateOnlySchema,
  })
  .refine(({ start, end }) => end > start, {
    message: "All-day event end is exclusive and must be after start",
    path: ["end"],
  });

export const EventScheduleRecordSchema = z.discriminatedUnion("kind", [
  TimedScheduleRecordSchema,
  AllDayScheduleRecordSchema,
]);
export type EventScheduleRecord = z.infer<typeof EventScheduleRecordSchema>;

export const EventRecurrenceRecordSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("single") }),
  z.strictObject({ kind: z.literal("series"), rules: RRuleSchema }),
  z.strictObject({
    kind: z.literal("occurrence"),
    seriesId: ObjectIdSchema,
  }),
]);
export type EventRecurrenceRecord = z.infer<typeof EventRecurrenceRecordSchema>;

export const GoogleEventReferenceSchema = z.strictObject({
  provider: z.literal("google"),
  eventId: z.string().min(1),
  recurringEventId: z.string().min(1).nullable(),
});
export type GoogleEventReference = z.infer<typeof GoogleEventReferenceSchema>;

export const ExternalEventReferenceSchema = GoogleEventReferenceSchema;
export type ExternalEventReference = z.infer<
  typeof ExternalEventReferenceSchema
>;

export const EventRecordSchema = z.strictObject({
  _id: ObjectIdSchema,
  calendarId: ObjectIdSchema,
  content: EventContentSchema,
  schedule: EventScheduleRecordSchema,
  recurrence: EventRecurrenceRecordSchema,
  priority: PrioritySchema,
  externalReference: ExternalEventReferenceSchema.nullable(),
  createdAt: z.date(),
  updatedAt: z.date().nullable(),
});
export type EventRecord = z.infer<typeof EventRecordSchema>;
