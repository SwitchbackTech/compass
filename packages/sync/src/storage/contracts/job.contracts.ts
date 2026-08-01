import { z } from "zod/v4";
import {
  ConnectionIdSchema,
  PrincipalIdSchema,
  SyncCommandIdSchema,
  SyncJobIdSchema,
  TenantIdSchema,
} from "@core/types/sync/identity.contracts";

export const JobKindSchema = z.enum([
  "calendarListSync",
  "initialImport",
  "incrementalPull",
  "commandApply",
  "reconcile",
  "subscriptionMaintain",
  "repair",
]);
export type JobKind = z.infer<typeof JobKindSchema>;

// pending: waiting to be claimed. claimed: leased by a worker. failed: a
// terminal failure needing attention (retryable failures return to pending).
export const JobStateSchema = z.enum(["pending", "claimed", "failed"]);
export type JobState = z.infer<typeof JobStateSchema>;

export const JobFailureClassSchema = z.enum([
  "retryableTransient",
  "permanent",
]);
export type JobFailureClass = z.infer<typeof JobFailureClassSchema>;

// Persistence record for `jobs` — a small internal work item pointing at a
// connection and (optionally) a resource or command. A unique coalescing key
// collapses a storm of equivalent notifications into one job. Jobs hold no
// credentials and no event content.
export const JobRecordSchema = z.strictObject({
  _id: SyncJobIdSchema,
  tenantId: TenantIdSchema,
  principalId: PrincipalIdSchema,
  connectionId: ConnectionIdSchema,
  // What the job acts on. Both null for connection-wide work.
  resourceId: z.string().trim().min(1).nullable(),
  commandId: SyncCommandIdSchema.nullable(),
  kind: JobKindSchema,
  priority: z.number().int(),
  state: JobStateSchema,
  runAfter: z.date(),
  attempt: z.number().int().min(0),
  coalescingKey: z.string().trim().min(1),
  leaseOwner: z.string().trim().min(1).nullable(),
  leaseExpiresAt: z.date().nullable(),
  failureClass: JobFailureClassSchema.nullable(),
  // How many times the self-heal sweep has requeued this job after it reached
  // state:"failed". Distinct from `attempt` (which a requeue resets to give
  // the job a fresh retry ladder) so a resource that keeps failing cannot be
  // requeued forever — the sweep stops once this hits its cap.
  //
  // Defaulted, not required: this field was introduced after jobs already
  // existed in production, and a job doc predating it is still perfectly
  // valid work. Parsing one must not throw — enqueue coalesces onto whatever
  // doc already holds a key and re-parses it, so a single unparseable job
  // took down every sweep fleet-wide for 23h (2026-07-31).
  requeuedCount: z.number().int().min(0).default(0),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type JobRecord = z.infer<typeof JobRecordSchema>;

export const JobEnqueueSchema = JobRecordSchema.omit({
  _id: true,
  state: true,
  attempt: true,
  leaseOwner: true,
  leaseExpiresAt: true,
  failureClass: true,
  requeuedCount: true,
  createdAt: true,
  updatedAt: true,
});
export type JobEnqueue = z.infer<typeof JobEnqueueSchema>;
