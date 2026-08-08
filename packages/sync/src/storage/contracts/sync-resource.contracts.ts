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

// A newly discovered calendar does not become ready merely because its first
// import produced a cursor. It must also establish its watch (or prove watch is
// unsupported) and complete one incremental pull after that boundary.
export const ResourceBootstrapStateSchema = z.enum([
  "importing",
  "watching",
  "catchingUp",
  "ready",
]);
export type ResourceBootstrapState = z.infer<
  typeof ResourceBootstrapStateSchema
>;

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
  // A repair's STAGING generation. Only a non-destructive repair touches this:
  // it bumps this ahead of activeGeneration to build a fresh generation
  // alongside the queryable one, then sets activeGeneration to it on success.
  // Equal to activeGeneration in steady state. Steady-state writers (import and
  // pull) do NOT write into this — they write the active generation, so a repair
  // left incomplete (this bumped ahead, never activated) never strands their
  // writes in a generation reads ignore.
  importGeneration: z.number().int().min(0),
  // The generation reads SERVE and steady-state writers (import, pull) write
  // into — the single live generation outside a repair. A repair holds this back
  // at the old generation while it builds importGeneration, then activates the
  // new one atomically, so reads never see a half-built repair. Defaults to 0 so
  // a resource written before this field existed reads as its single generation.
  activeGeneration: z.number().int().min(0).default(0),
  lastAttemptAt: z.date().nullable(),
  lastSuccessAt: z.date().nullable(),
  // Set when the provider durably rejects reads for this resource (a
  // non-transient 4xx retries cannot fix — see the readFailed settlement for
  // events resources and the discoveryFailed settlement for calendarList in
  // sync-job-dispatch). Cleared by the next successful pass (advanceCursor).
  // Connection health surfaces a non-null marker on an active events calendar
  // or on the connection's calendarList resource as delayed/providerErrors.
  // Defaults tolerate rows written before the field.
  lastReadFailureAt: z.date().nullable().default(null),
  // The redacted failure detail (HTTP status + provider reason) for triage.
  lastReadFailureDetail: z.string().min(1).nullable().default(null),
  // Fresh resources progress importing -> watching -> catchingUp -> ready.
  // Always explicit on every row (backfill-bootstrap-state stamped every row
  // that predated the field) - no default here, so a row silently missing it
  // fails to parse instead of quietly defaulting.
  bootstrapState: ResourceBootstrapStateSchema,
  // Set when the provider terminally refused to open a push channel for this
  // calendar (watch unsupported/durably rejected — see maintainSubscription's
  // "unsupported" outcome). While set, the incremental-pull path stops
  // re-attempting a watch on every cycle; the daily calendar-list full pass
  // clears it so a provider-side change is eventually retried. A successful
  // watch also clears it. Defaults tolerate rows written before the field —
  // REQUIRED for any new field here: enqueue/sweeps re-parse whatever row
  // exists, and a required field froze the fleet for 23h (2026-07-31).
  watchUnsupportedAt: z.date().nullable().default(null),
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

export const SyncResourceUpsertSchema = SyncResourceRecordSchema.pick({
  tenantId: true,
  principalId: true,
  connectionId: true,
  resourceKind: true,
  calendarId: true,
});
export type SyncResourceUpsert = z.infer<typeof SyncResourceUpsertSchema>;
