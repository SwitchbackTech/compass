import { z } from "zod/v4";
import { EventIdSchema } from "@core/types/domain-primitives";
import { EventScheduleSchema } from "@core/types/event.contracts";
import {
  OccurrenceKeySchema,
  SyncEventCalendarIdSchema,
} from "@core/types/sync/event.contracts";
import {
  PrincipalIdSchema,
  TenantIdSchema,
} from "@core/types/sync/identity.contracts";

// Persistence record for `event_occurrences` (ledger S13) — a derived,
// display-ready instance projected from an event/series within the rolling
// horizon (R-AVAIL-06). Never expand a non-ending series to completion; only
// the bounded window is materialized. tenantId/principalId are denormalized for
// scoped queries and the principal_start index; generation ties an occurrence
// to the import generation of its source event so a repair can rebuild in a new
// generation before removing the old one.
export const EventOccurrenceRecordSchema = z.strictObject({
  _id: z.string().regex(/^[0-9a-f]{24}$/i),
  tenantId: TenantIdSchema,
  principalId: PrincipalIdSchema,
  eventId: EventIdSchema,
  occurrenceKey: OccurrenceKeySchema,
  calendarId: SyncEventCalendarIdSchema,
  schedule: EventScheduleSchema,
  // Normalized start instant for range queries and the start-time indexes.
  // Computed by the projection layer (the caller) so all-day and timed
  // occurrences compare on one coherent axis — string-comparing the union
  // schedule.start would be wrong across schedule kinds and offsets.
  startAt: z.date(),
  busy: z.boolean(),
  title: z.string(),
  cancelled: z.boolean(),
  generation: z.number().int().min(0),
});
export type EventOccurrenceRecord = z.infer<typeof EventOccurrenceRecordSchema>;
