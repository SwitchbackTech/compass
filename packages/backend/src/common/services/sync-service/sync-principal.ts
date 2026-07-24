import { type SyncPrincipal } from "./sync-service.client";

/**
 * The v1 identity bridge from a Compass user to a sync principal.
 *
 * Compass runs one personal tenant with a single principal per user, so both the
 * tenant and the principal are the user's own id. `userId` is the Compass Mongo
 * `_id` (ObjectId-shaped), which is exactly what the sync service's TenantId and
 * PrincipalId schemas require.
 *
 * This is the single place the mapping lives. A future multi-principal-per-tenant
 * model (distinct generated ids with a stored lookup) changes only this function
 * and its callers keep working unchanged.
 */
export function toSyncPrincipal(userId: string): SyncPrincipal {
  return { tenantId: userId, principalId: userId };
}
