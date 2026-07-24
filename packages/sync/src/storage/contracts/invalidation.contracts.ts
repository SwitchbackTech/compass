import { z } from "zod/v4";
import { SyncInvalidationSchema } from "@core/types/sync/change-feed.contracts";
import {
  PrincipalIdSchema,
  TenantIdSchema,
} from "@core/types/sync/identity.contracts";
import { ObjectIdStringSchema } from "@core/types/type.utils";

// Persistence record for `invalidations` — the durable, content-free outbox
// behind GET /internal/changes. Rows carry IDs (and import progress) only;
// clients always refetch canonical state. A TTL index removes rows after the
// retention window; a resume cursor older than that window yields resyncRequired.
export const InvalidationRecordSchema = z.strictObject({
  _id: ObjectIdStringSchema,
  tenantId: TenantIdSchema,
  principalId: PrincipalIdSchema,
  invalidation: SyncInvalidationSchema,
  emittedAt: z.date(),
  expiresAt: z.date(),
});
export type InvalidationRecord = z.infer<typeof InvalidationRecordSchema>;

export const InvalidationAppendSchema = z.strictObject({
  tenantId: TenantIdSchema,
  principalId: PrincipalIdSchema,
  invalidation: SyncInvalidationSchema,
  emittedAt: z.date(),
});
export type InvalidationAppend = z.infer<typeof InvalidationAppendSchema>;
