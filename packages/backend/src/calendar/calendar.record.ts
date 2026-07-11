import { z } from "zod/v4";
import { CalendarAccessSchema } from "@core/types/calendar.contracts";
import { HexColorSchema, TimeZoneSchema } from "@core/types/domain-primitives";
import { zObjectId } from "@core/types/type.utils";

// Reuse the zObjectId sentinel, never z.instanceof(ObjectId):
// zod-to-mongo-schema.ts maps zObjectId to bsonType "objectId" by reference,
// while a raw instanceof degrades to an unvalidated {} in the $jsonSchema.
const ObjectIdSchema = zObjectId;

export const LocalCalendarSourceRecordSchema = z.strictObject({
  provider: z.literal("local"),
});

export const GoogleCalendarSourceRecordSchema = z.strictObject({
  provider: z.literal("google"),
  calendarId: z.string().min(1),
  etag: z.string().min(1),
});

export const CalendarSourceRecordSchema = z.discriminatedUnion("provider", [
  LocalCalendarSourceRecordSchema,
  GoogleCalendarSourceRecordSchema,
]);
export type CalendarSourceRecord = z.infer<typeof CalendarSourceRecordSchema>;

export const CalendarRecordSchema = z
  .strictObject({
    _id: ObjectIdSchema,
    userId: ObjectIdSchema,
    name: z.string(),
    description: z.string(),
    timeZone: TimeZoneSchema.nullable(),
    foregroundColor: HexColorSchema,
    backgroundColor: HexColorSchema,
    access: CalendarAccessSchema,
    isPrimary: z.boolean(),
    isVisible: z.boolean(),
    isActive: z.boolean(),
    source: CalendarSourceRecordSchema,
    createdAt: z.date(),
    updatedAt: z.date().nullable(),
  })
  .superRefine(({ access, source }, context) => {
    if (source.provider === "local" && access !== "owner") {
      context.addIssue({
        code: "custom",
        message: "Local calendars must have owner access",
        path: ["access"],
      });
    }
  });
export type CalendarRecord = z.infer<typeof CalendarRecordSchema>;
