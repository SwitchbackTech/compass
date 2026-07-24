import { z } from "zod/v4";
import {
  ObjectIdStringSchema,
  RGBHexSchema,
  TimezoneSchema,
  zYearMonthDayString,
} from "@core/types/type.utils";

// Opaque on purpose: under sync event delegation (S39 D1=II) a projected
// series occurrence carries a composed id (`${eventId}::${recurrenceId}`),
// not a Mongo ObjectId. The web treats Event.id as opaque (React key +
// PUT/DELETE target); only the backend decode step cares about the shape.
export const EventIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(256)
  .brand<"EventId">();
export type EventId = z.infer<typeof EventIdSchema>;

export const CalendarIdSchema = ObjectIdStringSchema.brand<"CalendarId">();
export type CalendarId = z.infer<typeof CalendarIdSchema>;

export const DateOnlySchema = zYearMonthDayString.brand<"DateOnly">();
export type DateOnly = z.infer<typeof DateOnlySchema>;

export const DateTimeSchema = z.iso
  .datetime({ offset: true })
  .brand<"DateTime">();
export type DateTime = z.infer<typeof DateTimeSchema>;

export const TimeZoneSchema = TimezoneSchema.brand<"TimeZone">();
export type TimeZone = z.infer<typeof TimeZoneSchema>;

export const HexColorSchema = RGBHexSchema;
export type HexColor = z.infer<typeof HexColorSchema>;

export const RRuleSchema = z.array(z.string().trim().min(1)).min(1).readonly();
export type RRule = z.infer<typeof RRuleSchema>;
