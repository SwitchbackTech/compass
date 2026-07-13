import { z } from "zod/v4";
import {
  CalendarIdSchema,
  DateTimeSchema,
  EventIdSchema,
  PrioritySchema,
  RRuleSchema,
} from "@core/types/domain-primitives";
import {
  BusyPeriodSchema,
  EditableRecurrenceSchema,
  EventScheduleSchema,
  EventSchema,
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

export const DeleteEventInputSchema = z.strictObject({
  scope: RecurrenceScopeSchema,
});
export type DeleteEventInput = z.infer<typeof DeleteEventInputSchema>;

export const EventListQuerySchema = z
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
  "DUPLICATE_EVENT_ID",
  "INVALID_SCHEDULE",
  "PROVIDER_FAILURE",
]);

export const EventMutationErrorSchema = z.strictObject({
  code: EventMutationErrorCodeSchema,
  message: z.string().min(1),
  retryable: z.boolean(),
});
export type EventMutationError = z.infer<typeof EventMutationErrorSchema>;
