import { z } from "zod/v4";
import {
  CalendarIdSchema,
  DateOnlySchema,
  DateTimeSchema,
  EventIdSchema,
  PrioritySchema,
  RRuleSchema,
  SortOrderSchema,
} from "@core/types/domain-primitives";
import {
  BusyPeriodSchema,
  EditableRecurrenceSchema,
  EventScheduleSchema,
  EventSchema,
  ScheduledScheduleSchema,
  SomedayScheduleSchema,
} from "@core/types/event.contracts";

const EditableContentSchema = z.strictObject({
  kind: z.literal("details"),
  title: z.string(),
  description: z.string(),
});

export const RecurrenceScopeSchema = z.enum([
  "this",
  "thisAndFollowing",
  "all",
]);
export type RecurrenceScope = z.infer<typeof RecurrenceScopeSchema>;

export const RecurrenceEditSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("preserve") }),
  z.strictObject({ kind: z.literal("single") }),
  z.strictObject({ kind: z.literal("series"), rules: RRuleSchema }),
]);
export type RecurrenceEdit = z.infer<typeof RecurrenceEditSchema>;

export const CreateEventInputSchema = z.strictObject({
  // Optional client-generated id (A25): preserves optimistic creation and
  // undo-of-delete, which restores an event under its original id. The server
  // enforces uniqueness and rejects an id that already exists.
  id: EventIdSchema.optional(),
  calendarId: CalendarIdSchema,
  content: EditableContentSchema,
  schedule: EventScheduleSchema,
  recurrence: EditableRecurrenceSchema,
  priority: PrioritySchema,
});
export type CreateEventInput = z.infer<typeof CreateEventInputSchema>;

export const ReplaceEventInputSchema = z.strictObject({
  content: EditableContentSchema,
  schedule: EventScheduleSchema,
  recurrence: RecurrenceEditSchema,
  priority: PrioritySchema,
  scope: RecurrenceScopeSchema,
});
export type ReplaceEventInput = z.infer<typeof ReplaceEventInputSchema>;

// The only command that changes an event's calendar (A24). "schedule" moves a
// someday event onto a writable calendar; "unschedule" moves a scheduled event
// to the Compass-local calendar and deletes any provider copy. Occurrences are
// rejected; a series transitions whole.
export const TransitionEventInputSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("schedule"),
    targetCalendarId: CalendarIdSchema,
    schedule: ScheduledScheduleSchema,
  }),
  z.strictObject({
    kind: z.literal("unschedule"),
    schedule: SomedayScheduleSchema,
  }),
]);
export type TransitionEventInput = z.infer<typeof TransitionEventInputSchema>;

export const DeleteEventInputSchema = z.strictObject({
  scope: RecurrenceScopeSchema,
});
export type DeleteEventInput = z.infer<typeof DeleteEventInputSchema>;

const EventOrderSchema = z.strictObject({
  eventId: EventIdSchema,
  sortOrder: SortOrderSchema,
});

export const ReorderEventsInputSchema = z
  .strictObject({
    period: z.enum(["week", "month"]),
    items: z.array(EventOrderSchema).min(1),
  })
  .refine(
    ({ items }) =>
      new Set(items.map(({ eventId }) => eventId)).size === items.length,
    { message: "Event ids must be unique", path: ["items"] },
  );
export type ReorderEventsInput = z.infer<typeof ReorderEventsInputSchema>;

const RangeEventListQuerySchema = z
  .strictObject({
    kind: z.literal("range"),
    start: DateTimeSchema,
    end: DateTimeSchema,
    priorities: z.array(PrioritySchema),
  })
  .refine(({ start, end }) => Date.parse(end) > Date.parse(start), {
    message: "Range end must be after start",
    path: ["end"],
  });

// No cursor or limit: the product caps someday lists at 9 per period (A35),
// so the whole period is one bounded read.
const SomedayEventListQuerySchema = z.strictObject({
  kind: z.literal("someday"),
  period: z.enum(["week", "month"]),
  anchorDate: DateOnlySchema,
});

export const EventListQuerySchema = z.discriminatedUnion("kind", [
  RangeEventListQuerySchema,
  SomedayEventListQuerySchema,
]);
export type EventListQuery = z.infer<typeof EventListQuerySchema>;

export const EventResponseSchema = z.strictObject({ event: EventSchema });
export type EventResponse = z.infer<typeof EventResponseSchema>;

export const EventListResponseSchema = z.strictObject({
  events: z.array(EventSchema),
});
export type EventListResponse = z.infer<typeof EventListResponseSchema>;

export const AvailabilityQuerySchema = z
  .strictObject({
    calendarIds: z.array(CalendarIdSchema).min(1),
    start: DateTimeSchema,
    end: DateTimeSchema,
  })
  .refine(({ start, end }) => Date.parse(end) > Date.parse(start), {
    message: "Availability end must be after start",
    path: ["end"],
  })
  .refine(
    ({ calendarIds }) => new Set(calendarIds).size === calendarIds.length,
    { message: "Calendar ids must be unique", path: ["calendarIds"] },
  );
export type AvailabilityQuery = z.infer<typeof AvailabilityQuerySchema>;

export const AvailabilityResponseSchema = z.strictObject({
  busyPeriods: z.array(BusyPeriodSchema),
});
export type AvailabilityResponse = z.infer<typeof AvailabilityResponseSchema>;

export const EventMutationErrorCodeSchema = z.enum([
  "EVENT_NOT_FOUND",
  "CALENDAR_NOT_FOUND",
  "CALENDAR_READ_ONLY",
  "RECURRENCE_CONFLICT",
  "INVALID_SCHEDULE",
  "PROVIDER_FAILURE",
]);

export const EventMutationErrorSchema = z.strictObject({
  code: EventMutationErrorCodeSchema,
  message: z.string().min(1),
  retryable: z.boolean(),
});
export type EventMutationError = z.infer<typeof EventMutationErrorSchema>;
