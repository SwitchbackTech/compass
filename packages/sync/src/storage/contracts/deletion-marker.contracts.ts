import { z } from "zod/v4";
import {
  ProviderEventVersionSchema,
  SyncEventCalendarIdSchema,
} from "@core/types/sync/event.contracts";
import {
  ConnectionIdSchema,
  PrincipalIdSchema,
  ProviderEventIdSchema,
  TenantIdSchema,
} from "@core/types/sync/identity.contracts";
import { ObjectIdStringSchema } from "@core/types/type.utils";

export const DeletionSourceSchema = z.enum(["compass", "provider"]);
export type DeletionSource = z.infer<typeof DeletionSourceSchema>;

// Persistence record for `deletion_markers` — the content-free memory of a
// confirmed deletion, kept only long enough to stop delayed sync work from
// resurrecting the event. A TTL index removes it after the retention window.
// Only provider identity and version are retained: no title, description,
// attendees, location, or conference data.
export const DeletionMarkerRecordSchema = z.strictObject({
  _id: ObjectIdStringSchema,
  tenantId: TenantIdSchema,
  principalId: PrincipalIdSchema,
  connectionId: ConnectionIdSchema,
  calendarId: SyncEventCalendarIdSchema,
  providerEventId: ProviderEventIdSchema,
  providerVersion: ProviderEventVersionSchema.nullable(),
  deletionSource: DeletionSourceSchema,
  deletedAt: z.date(),
  // When the TTL index removes this marker (deletedAt + retention window).
  expiresAt: z.date(),
});
export type DeletionMarkerRecord = z.infer<typeof DeletionMarkerRecordSchema>;

export const DeletionMarkerRecordInputSchema = z.strictObject({
  tenantId: TenantIdSchema,
  principalId: PrincipalIdSchema,
  connectionId: ConnectionIdSchema,
  calendarId: SyncEventCalendarIdSchema,
  providerEventId: ProviderEventIdSchema,
  providerVersion: ProviderEventVersionSchema.nullable(),
  deletionSource: DeletionSourceSchema,
  deletedAt: z.date(),
});
export type DeletionMarkerRecordInput = z.infer<
  typeof DeletionMarkerRecordInputSchema
>;
