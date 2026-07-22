import { z } from "zod/v4";
import { SyncEventCalendarIdSchema } from "@core/types/sync/event.contracts";
import {
  ConnectionIdSchema,
  PrincipalIdSchema,
  TenantIdSchema,
} from "@core/types/sync/identity.contracts";
import { ObjectIdStringSchema } from "@core/types/type.utils";

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
  _id: ObjectIdStringSchema,
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
  // The generation import and pull WRITE into. A non-destructive repair bumps
  // this to build a fresh generation alongside the queryable one.
  importGeneration: z.number().int().min(0),
  // The generation reads SERVE. Equal to importGeneration in steady state; a
  // repair holds it back at the old generation until the new one completes,
  // then activates it atomically, so reads never see a half-built repair.
  // Defaults to 0 so a resource written before this field existed reads as the
  // single generation it has.
  activeGeneration: z.number().int().min(0).default(0),
  lastAttemptAt: z.date().nullable(),
  lastSuccessAt: z.date().nullable(),
  // Push subscription: the provider channel id, its opaque resource id, the
  // per-channel secret the provider echoes back on callbacks, and when it
  // expires. All null when no subscription is active.
  subscriptionId: z.string().min(1).nullable(),
  subscriptionResourceId: z.string().min(1).nullable(),
  subscriptionToken: z.string().min(1).nullable(),
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
