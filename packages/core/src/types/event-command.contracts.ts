import { z } from "zod/v4";
import {
  CalendarIdSchema,
  DateTimeSchema,
  EventIdSchema,
  RRuleSchema,
} from "@core/types/domain-primitives";
import {
  BusyPeriodSchema,
  EditableRecurrenceSchema,
  EventScheduleSchema,
  EventSchema,
} from "@core/types/event.contracts";
import { OptionalNullableEventColorSchema } from "@core/types/event-color.contracts";

const EditableContentSchema = z.strictObject({
  kind: z.literal("details"),
  title: z.string(),
  description: z.string(),
  // Same convention as description: empty string means no location, always
  // sent and always overwritten on save (no separate "leave alone" state -
  // location has no calendar-default to inherit the way color does).
  location: z.string(),
  // Null clears a previously set color on replace; omit leaves sync color
  // alone when the client did not touch it.
  color: OptionalNullableEventColorSchema,
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
});
export type CreateEventInput = z.infer<typeof CreateEventInputSchema>;

export const ReplaceEventInputSchema = z.strictObject({
  // Destination calendar for a cross-calendar move (drag between Day-view
  // columns). Omitted or equal to the event's current calendar means no
  // move. Only single (non-recurring) events may move; the server rejects
  // moves for series/occurrences.
  calendarId: CalendarIdSchema.optional(),
  content: EditableContentSchema,
  schedule: EventScheduleSchema,
  recurrence: RecurrenceEditSchema,
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
    // Optional server-side calendar scope. When present, the backend
    // intersects with calendars the principal owns (never trusts the client
    // blindly). Omitted keeps the legacy "all calendars" read for older
    // clients; the web passes visible calendar ids to avoid draining hidden
    // calendars on first paint.
    calendarIds: z.array(CalendarIdSchema).min(1).max(100).optional(),
  })
  .refine(({ start, end }) => Date.parse(end) > Date.parse(start), {
    message: "Range end must be after start",
    path: ["end"],
  })
  .refine(
    ({ calendarIds }) =>
      calendarIds === undefined ||
      new Set(calendarIds).size === calendarIds.length,
    { message: "Calendar ids must be unique", path: ["calendarIds"] },
  );
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
  // The event id addressed a specific occurrence (it carried the `::`
  // composite separator) but failed to decode — never silently widen the
  // scope to the whole event/series for an id shaped like an occurrence
  // reference but malformed.
  "INVALID_OCCURRENCE_ID",
  "PROVIDER_FAILURE",
  "GOOGLE_REVOKED",
  // Scoped cutover maintenance: cloud/provider mutations paused (S50).
  "MAINTENANCE",
  // A replace tried to move a provider-linked event to a different calendar.
  // Sync has no executor for a "move" command yet (unconditionally fails it),
  // so this is rejected before any command is submitted — never retryable.
  "MOVE_UNSUPPORTED",
]);

export const EventMutationErrorSchema = z.strictObject({
  code: EventMutationErrorCodeSchema,
  message: z.string().min(1),
  retryable: z.boolean(),
});
export type EventMutationError = z.infer<typeof EventMutationErrorSchema>;
