import { z } from "zod/v4";
import {
  CalendarIdSchema,
  DateTimeSchema,
  EventIdSchema,
  RRuleSchema,
} from "@core/types/domain-primitives";
import { EventScheduleSchema } from "@core/types/event.contracts";
import {
  ConnectionIdSchema,
  ProviderCalendarIdSchema,
  ProviderEventIdSchema,
} from "@core/types/sync/identity.contracts";

// Canonical, provider-neutral event contracts for Compass Sync (ledger S03).
// This is the logical record Sync persists per event/series (01-domain-model
// "Event"); Google/Microsoft SDK shapes stay inside provider adapters and
// never appear here. Schedule reuses the app-facing EventScheduleSchema
// (event.contracts.ts) since timed-vs-all-day/DST semantics are identical.

export const ClientEventIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(256)
  .brand<"ClientEventId">();
export type ClientEventId = z.infer<typeof ClientEventIdSchema>;

export const ProviderEventVersionSchema = z
  .string()
  .trim()
  .min(1)
  .max(1024)
  .brand<"ProviderEventVersion">();
export type ProviderEventVersion = z.infer<typeof ProviderEventVersionSchema>;

export const SyncEventOriginSchema = z.enum(["compass", "provider"]);
export type SyncEventOrigin = z.infer<typeof SyncEventOriginSchema>;

export const ProviderDeliveryStateSchema = z.enum([
  "pending",
  "confirmed",
  "failed",
]);
export type ProviderDeliveryState = z.infer<typeof ProviderDeliveryStateSchema>;

// Present only once an event is linked to exactly one owning provider
// calendar (R-EVENT-01, R-EVENT-02). Unlinked events have no provider truth.
export const SyncEventOwnershipSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("unlinked") }),
  z.strictObject({
    kind: z.literal("linked"),
    connectionId: ConnectionIdSchema,
    calendarId: ProviderCalendarIdSchema,
    providerEventId: ProviderEventIdSchema,
    providerVersion: ProviderEventVersionSchema,
    // Provider's own last-update timestamp; null until the provider has
    // reported one (e.g. immediately after an ambiguous create).
    providerUpdatedAt: DateTimeSchema.nullable(),
    deliveryState: ProviderDeliveryStateSchema,
    // Minimal opaque bag for adapter-internal identity/concurrency facts
    // (e.g. a recurring-instance fingerprint), never the full provider
    // payload (01-domain-model.md). Preserves what R-EVENT-05 needs without
    // duplicating provider state Sync doesn't otherwise model.
    providerMetadata: z.record(z.string(), z.string()).readonly().optional(),
  }),
]);
export type SyncEventOwnership = z.infer<typeof SyncEventOwnershipSchema>;

export const OrganizerSchema = z.strictObject({
  email: z.string().trim().min(1).max(320),
  displayName: z.string().trim().min(1).max(256).nullable(),
});
export type Organizer = z.infer<typeof OrganizerSchema>;

export const AttendeeResponseStatusSchema = z.enum([
  "needsAction",
  "accepted",
  "declined",
  "tentative",
]);
export type AttendeeResponseStatus = z.infer<
  typeof AttendeeResponseStatusSchema
>;

export const AttendeeSchema = z.strictObject({
  email: z.string().trim().min(1).max(320),
  displayName: z.string().trim().min(1).max(256).nullable(),
  responseStatus: AttendeeResponseStatusSchema,
});
export type Attendee = z.infer<typeof AttendeeSchema>;

export const ConferenceSchema = z.strictObject({
  url: z.url(),
  label: z.string().trim().min(1).max(256).nullable(),
});
export type Conference = z.infer<typeof ConferenceSchema>;

export const SyncEventContentSchema = z.strictObject({
  title: z.string(),
  description: z.string(),
  location: z.string().nullable(),
  organizer: OrganizerSchema.nullable(),
  attendees: z.array(AttendeeSchema).readonly(),
  conference: ConferenceSchema.nullable(),
});
export type SyncEventContent = z.infer<typeof SyncEventContentSchema>;

const SingleRecurrenceSchema = z.strictObject({ kind: z.literal("single") });

const SeriesMasterRecurrenceSchema = z.strictObject({
  kind: z.literal("seriesMaster"),
  rules: RRuleSchema,
});

// One overridden or cancelled instance of a recurring series (R-EVENT-06).
// recurrenceId is the instance's original scheduled start before override —
// the standard identity providers use to address one occurrence.
const RecurrenceExceptionSchema = z.strictObject({
  kind: z.literal("exception"),
  seriesId: EventIdSchema,
  recurrenceId: DateTimeSchema,
  cancelled: z.boolean(),
});

export const SyncEventRecurrenceSchema = z.discriminatedUnion("kind", [
  SingleRecurrenceSchema,
  SeriesMasterRecurrenceSchema,
  RecurrenceExceptionSchema,
]);
export type SyncEventRecurrence = z.infer<typeof SyncEventRecurrenceSchema>;

// Visible while a Compass-initiated deletion has not yet been provider
// confirmed (R-EVENT-09). The record is removed, and a content-free
// deletion marker takes its place, only after confirmation.
export const SyncEventLifecycleStateSchema = z.enum([
  "active",
  "deletionPending",
]);
export type SyncEventLifecycleState = z.infer<
  typeof SyncEventLifecycleStateSchema
>;

export const SyncEventSchema = z.strictObject({
  id: EventIdSchema,
  // Caller-generated id used to make anonymous-to-cloud promotion and retry
  // idempotent (R-LIFE-02); null once no longer needed for that purpose.
  clientEventId: ClientEventIdSchema.nullable(),
  origin: SyncEventOriginSchema,
  ownership: SyncEventOwnershipSchema,
  content: SyncEventContentSchema,
  schedule: EventScheduleSchema,
  recurrence: SyncEventRecurrenceSchema,
  lifecycleState: SyncEventLifecycleStateSchema,
  createdAt: DateTimeSchema,
  updatedAt: DateTimeSchema,
  confirmedAt: DateTimeSchema.nullable(),
});
export type SyncEvent = z.infer<typeof SyncEventSchema>;

// Sync is the store of record for both provider-linked and still-unlinked
// Compass cloud events (S26), so an occurrence's calendar grouping key must
// accept either identity space: Compass's own calendar id for an unlinked
// event, or the provider calendar id once one exists (R-LIFE-03).
export const SyncEventCalendarIdSchema = z.union([
  CalendarIdSchema,
  ProviderCalendarIdSchema,
]);
export type SyncEventCalendarId = z.infer<typeof SyncEventCalendarIdSchema>;

// One derived, display-ready instance within the rolling sync horizon (12
// months past / 18 months future). Never expand a non-ending series to
// completion; project only the bounded window a query needs (R-AVAIL-06).
export const OccurrenceKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(512)
  .brand<"OccurrenceKey">();
export type OccurrenceKey = z.infer<typeof OccurrenceKeySchema>;

export const SyncEventOccurrenceSchema = z.strictObject({
  occurrenceKey: OccurrenceKeySchema,
  eventId: EventIdSchema,
  calendarId: SyncEventCalendarIdSchema,
  schedule: EventScheduleSchema,
  busy: z.boolean(),
  title: z.string(),
  cancelled: z.boolean(),
});
export type SyncEventOccurrence = z.infer<typeof SyncEventOccurrenceSchema>;

export const EventOccurrenceListQuerySchema = z
  .strictObject({
    calendarIds: z.array(SyncEventCalendarIdSchema).min(1).readonly(),
    start: DateTimeSchema,
    end: DateTimeSchema,
    cursor: z.string().trim().min(1).max(1024).optional(),
    limit: z.number().int().min(1).max(500).optional(),
  })
  .refine(({ start, end }) => Date.parse(end) > Date.parse(start), {
    message: "Range end must be after start",
    path: ["end"],
  });
export type EventOccurrenceListQuery = z.infer<
  typeof EventOccurrenceListQuerySchema
>;

export const EventOccurrenceListResponseSchema = z.strictObject({
  occurrences: z.array(SyncEventOccurrenceSchema).readonly(),
  nextCursor: z.string().trim().min(1).max(1024).nullable(),
});
export type EventOccurrenceListResponse = z.infer<
  typeof EventOccurrenceListResponseSchema
>;
