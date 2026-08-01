import {
  type SyncPrincipal,
  type SyncServiceClient,
} from "@backend/common/services/sync-service/sync-service.client";

/**
 * Ask Sync to enqueue catch-up pulls for the signed-in user. Maps Sync client
 * failures onto thrown errors the auth controller turns into HTTP responses.
 */
export async function refreshSyncConnection(
  client: Pick<SyncServiceClient, "refreshConnection">,
  principal: SyncPrincipal,
): Promise<{ enqueued: number }> {
  const result = await client.refreshConnection(principal);
  if (!result.ok) {
    const error = new Error(
      `Sync refresh failed (${result.error.kind})`,
    ) as Error & { syncErrorKind: string; status?: number };
    error.syncErrorKind = result.error.kind;
    error.status = result.error.status;
    throw error;
  }
  return result.value;
}
