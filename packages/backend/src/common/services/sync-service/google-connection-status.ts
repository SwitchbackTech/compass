import { Logger } from "@core/logger/winston.logger";
import { type GoogleConnectionState } from "@core/types/user.types";
import { toGoogleConnectionState } from "./connection-state.translation";
import {
  type SyncPrincipal,
  type SyncServiceClient,
} from "./sync-service.client";

const logger = Logger("app:google-connection-status");

/**
 * Resolve the browser-facing Google connection state from the sync service.
 *
 * On any client failure we cannot confirm the real state, so we surface
 * ATTENTION (a soft "needs a look") rather than a confidently-wrong value or a
 * failed metadata request. Wart: a sync outage flips every delegated user to
 * ATTENTION until it recovers. That is acceptable for the opt-in first cut of
 * status delegation, and a deployment that routes connections to sync is
 * expected to monitor sync availability.
 */
export async function resolveGoogleConnectionStateFromSync(
  client: Pick<SyncServiceClient, "listConnections">,
  principal: SyncPrincipal,
): Promise<GoogleConnectionState> {
  const result = await client.listConnections(principal);
  if (result.ok) {
    return toGoogleConnectionState(result.value.connections);
  }

  logger.warn(
    `Sync connection status unavailable (${result.error.kind}); reporting ATTENTION ` +
      `[correlationId=${result.error.correlationId}]`,
  );
  return "ATTENTION";
}
