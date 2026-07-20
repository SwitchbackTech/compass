import { z } from "zod/v4";
import { DateTimeSchema } from "@core/types/domain-primitives";
import { SyncEventCalendarIdSchema } from "@core/types/sync/event.contracts";
import { ConnectionIdSchema } from "@core/types/sync/identity.contracts";

// Busy-query contracts for Compass Sync (ledger S05). Availability results
// must disclose freshness/completeness rather than presenting stale or
// incomplete data as known-current (R-PRINCIPLE-02, R-AVAIL-03), and a
// booking must fail closed when any required blocker cannot be freshly
// verified (R-AVAIL-04). Do not add booking policy (working hours, buffers,
// which calendars block) here — that stays in the Compass booking module
// (03-availability-and-booking.md).

// Half-open [start, end) interval only: no calendar id, title, or other
// event content ever appears on a busy interval (R-SEC-04 privacy).
export const BusyIntervalSchema = z
  .strictObject({
    start: DateTimeSchema,
    end: DateTimeSchema,
  })
  .refine(({ start, end }) => Date.parse(end) > Date.parse(start), {
    message: "Busy interval end must be after start",
    path: ["end"],
  });
export type BusyInterval = z.infer<typeof BusyIntervalSchema>;

export const BusyQueryPurposeSchema = z.enum([
  "display",
  "bookingConfirmation",
]);
export type BusyQueryPurpose = z.infer<typeof BusyQueryPurposeSchema>;

// R-AVAIL-06 requires supporting at least 12 months into the future; this is
// the Sync-level ceiling. The booking module further narrows this to its own
// 60-day window when it calls in (03-availability-and-booking.md).
const MAX_BUSY_QUERY_RANGE_DAYS = 366;
const MAX_BUSY_QUERY_RANGE_MS = MAX_BUSY_QUERY_RANGE_DAYS * 24 * 60 * 60 * 1000;

export const BusyQuerySchema = z
  .strictObject({
    calendarIds: z.array(SyncEventCalendarIdSchema).min(1).readonly(),
    start: DateTimeSchema,
    end: DateTimeSchema,
    // Caller's tolerance for how old the underlying sync data may be.
    // Omitted means the caller accepts whatever freshness evidence returns.
    maxDataAgeSeconds: z.number().int().positive().optional(),
    purpose: BusyQueryPurposeSchema,
  })
  .refine(({ start, end }) => Date.parse(end) > Date.parse(start), {
    message: "Range end must be after start",
    path: ["end"],
  })
  .refine(
    ({ start, end }) =>
      Date.parse(end) - Date.parse(start) <= MAX_BUSY_QUERY_RANGE_MS,
    {
      message: `Range must not exceed ${MAX_BUSY_QUERY_RANGE_DAYS} days`,
      path: ["end"],
    },
  );
export type BusyQuery = z.infer<typeof BusyQuerySchema>;

export const BusyConnectionEvidenceSchema = z.strictObject({
  connectionId: ConnectionIdSchema,
  lastSyncedAt: DateTimeSchema.nullable(),
  lastHealthyAt: DateTimeSchema.nullable(),
});
export type BusyConnectionEvidence = z.infer<
  typeof BusyConnectionEvidenceSchema
>;

export const IncompleteCalendarReasonSchema = z.enum([
  "missing",
  "stale",
  "connectionUnhealthy",
  "capabilityUnavailable",
]);
export type IncompleteCalendarReason = z.infer<
  typeof IncompleteCalendarReasonSchema
>;

export const IncompleteCalendarSchema = z.strictObject({
  calendarId: SyncEventCalendarIdSchema,
  reason: IncompleteCalendarReasonSchema,
});
export type IncompleteCalendar = z.infer<typeof IncompleteCalendarSchema>;

export const BusyQueryResponseSchema = z
  .strictObject({
    intervals: z.array(BusyIntervalSchema).readonly(),
    computedAt: DateTimeSchema,
    connections: z.array(BusyConnectionEvidenceSchema).readonly(),
    complete: z.boolean(),
    incompleteCalendars: z.array(IncompleteCalendarSchema).readonly(),
    // True only when every blocker meets confirmation freshness
    // (R-AVAIL-04). Correct fail-closed responses still count as available
    // service behavior for R-QUALITY-02, not as a failed query.
    bookable: z.boolean(),
  })
  .refine(
    (response) =>
      response.complete === (response.incompleteCalendars.length === 0),
    {
      message: "complete must agree with an empty incompleteCalendars list",
      path: ["complete"],
    },
  )
  .refine((response) => !response.bookable || response.complete, {
    message: "bookable requires complete",
    path: ["bookable"],
  });
export type BusyQueryResponse = z.infer<typeof BusyQueryResponseSchema>;
