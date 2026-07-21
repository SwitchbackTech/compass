import { z } from "zod/v4";
import { SyncEventCalendarIdSchema } from "@core/types/sync/event.contracts";
import {
  ConnectionIdSchema,
  PrincipalIdSchema,
  TenantIdSchema,
} from "@core/types/sync/identity.contracts";

// A connection's calendar list, or one calendar's event collection — each an
// independently synchronized unit of work.
export const ResourceKindSchema = z.enum(["calendarList", "events"]);
export type ResourceKind = z.infer<typeof ResourceKindSchema>;

// Persistence record for `sync_resources` — one independently synchronized
// provider resource with its cursors, import generation, timing, and push
// subscription. A calendar-list resource has no calendarId (there is one per
// connection); an events resource is keyed to one provider calendar. Holds no
// event content.
export const SyncResourceRecordSchema = z.strictObject({
  _id: z.string().regex(/^[0-9a-f]{24}$/i),
  tenantId: TenantIdSchema,
  principalId: PrincipalIdSchema,
  connectionId: ConnectionIdSchema,
  resourceKind: ResourceKindSchema,
  calendarId: SyncEventCalendarIdSchema.nullable(),
  // Opaque provider incremental cursor. Advances only after every page in a
  // batch has committed.
  syncCursor: z.string().min(1).nullable(),
  // Mid-batch page checkpoint for resumable pulls; null between batches.
  pageCursor: z.string().min(1).nullable(),
  importGeneration: z.number().int().min(0),
  lastAttemptAt: z.date().nullable(),
  lastSuccessAt: z.date().nullable(),
  // Push subscription: the provider channel id, its opaque resource id, and
  // when it expires. All null when no subscription is active.
  subscriptionId: z.string().min(1).nullable(),
  subscriptionResourceId: z.string().min(1).nullable(),
  subscriptionExpiresAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type SyncResourceRecord = z.infer<typeof SyncResourceRecordSchema>;

export const SyncResourceUpsertSchema = z.strictObject({
  tenantId: TenantIdSchema,
  principalId: PrincipalIdSchema,
  connectionId: ConnectionIdSchema,
  resourceKind: ResourceKindSchema,
  calendarId: SyncEventCalendarIdSchema.nullable(),
});
export type SyncResourceUpsert = z.infer<typeof SyncResourceUpsertSchema>;
