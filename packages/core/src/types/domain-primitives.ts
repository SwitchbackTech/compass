import { z } from "zod/v4";
import { Priorities } from "@core/constants/core.constants";
import {
  RGBHexSchema,
  TimezoneSchema,
  zYearMonthDayString,
} from "@core/types/type.utils";

const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i;

export const EventIdSchema = z
  .string()
  .regex(OBJECT_ID_PATTERN)
  .brand<"EventId">();
export type EventId = z.infer<typeof EventIdSchema>;

export const CalendarIdSchema = z
  .string()
  .regex(OBJECT_ID_PATTERN)
  .brand<"CalendarId">();
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

export const PrioritySchema = z.enum(Priorities);
export type Priority = z.infer<typeof PrioritySchema>;

export const RRuleSchema = z.array(z.string().trim().min(1)).min(1).readonly();
export type RRule = z.infer<typeof RRuleSchema>;
