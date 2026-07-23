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
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type JobRecord = z.infer<typeof JobRecordSchema>;

export const JobEnqueueSchema = z.strictObject({
  tenantId: TenantIdSchema,
  principalId: PrincipalIdSchema,
  connectionId: ConnectionIdSchema,
  resourceId: z.string().trim().min(1).nullable(),
  commandId: SyncCommandIdSchema.nullable(),
  kind: JobKindSchema,
  priority: z.number().int(),
  runAfter: z.date(),
  coalescingKey: z.string().trim().min(1),
});
export type JobEnqueue = z.infer<typeof JobEnqueueSchema>;
