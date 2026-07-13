import { z } from "zod/v4";
import {
  CalendarIdSchema,
  DateOnlySchema,
  DateTimeSchema,
  EventIdSchema,
  PrioritySchema,
  RRuleSchema,
  TimeZoneSchema,
} from "@core/types/domain-primitives";

export const EventContentSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("details"),
    title: z.string(),
    description: z.string(),
  }),
  z.strictObject({ kind: z.literal("busy") }),
]);
export type EventContent = z.infer<typeof EventContentSchema>;

const TimedScheduleSchema = z
  .strictObject({
    kind: z.literal("timed"),
    start: DateTimeSchema,
    end: DateTimeSchema,
    timeZone: TimeZoneSchema,
  })
  .refine(({ start, end }) => Date.parse(end) > Date.parse(start), {
    message: "Timed event end must be after start",
    path: ["end"],
  });

const AllDayScheduleSchema = z
  .strictObject({
    kind: z.literal("allDay"),
    start: DateOnlySchema,
    end: DateOnlySchema,
  })
  .refine(({ start, end }) => end > start, {
    message: "All-day event end is exclusive and must be after start",
    path: ["end"],
  });

export const EventScheduleSchema = z.discriminatedUnion("kind", [
  TimedScheduleSchema,
  AllDayScheduleSchema,
]);
export type EventSchedule = z.infer<typeof EventScheduleSchema>;

const SingleRecurrenceSchema = z.strictObject({
  kind: z.literal("single"),
});

const SeriesRecurrenceSchema = z.strictObject({
  kind: z.literal("series"),
  rules: RRuleSchema,
});

const OccurrenceRecurrenceSchema = z.strictObject({
  kind: z.literal("occurrence"),
  seriesId: EventIdSchema,
});

export const EditableRecurrenceSchema = z.discriminatedUnion("kind", [
  SingleRecurrenceSchema,
  SeriesRecurrenceSchema,
]);
export type EditableRecurrence = z.infer<typeof EditableRecurrenceSchema>;

export const EventRecurrenceSchema = z.discriminatedUnion("kind", [
  SingleRecurrenceSchema,
  SeriesRecurrenceSchema,
  OccurrenceRecurrenceSchema,
]);
export type EventRecurrence = z.infer<typeof EventRecurrenceSchema>;

export const EventSchema = z.strictObject({
  id: EventIdSchema,
  calendarId: CalendarIdSchema,
  content: EventContentSchema,
  schedule: EventScheduleSchema,
  recurrence: EventRecurrenceSchema,
  priority: PrioritySchema,
  createdAt: DateTimeSchema,
  updatedAt: DateTimeSchema.nullable(),
});
export type Event = z.infer<typeof EventSchema>;

export const BusyPeriodSchema = z
  .strictObject({
    calendarId: CalendarIdSchema,
    start: DateTimeSchema,
    end: DateTimeSchema,
  })
  .refine(({ start, end }) => Date.parse(end) > Date.parse(start), {
    message: "Busy period end must be after start",
    path: ["end"],
  });
export type BusyPeriod = z.infer<typeof BusyPeriodSchema>;
