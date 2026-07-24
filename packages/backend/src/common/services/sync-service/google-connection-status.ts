import { Logger } from "@core/logger/winston.logger";
import {
  type GoogleConnectionState,
  type GoogleSyncConnectionSummary,
} from "@core/types/user.types";
import {
  selectPrimaryGoogleConnection,
  toGoogleConnectionState,
  toGoogleSyncConnectionSummary,
} from "./connection-state.translation";
import {
  type SyncPrincipal,
  type SyncServiceClient,
} from "./sync-service.client";

const logger = Logger("app:google-connection-status");

export interface GoogleConnectionFromSync {
  connectionState: GoogleConnectionState;
  // Primary Sync connection summary for the browser (null when none / outage).
  connection: GoogleSyncConnectionSummary | null;
}

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
export async function resolveGoogleConnectionFromSync(
  client: Pick<SyncServiceClient, "listConnections">,
  principal: SyncPrincipal,
): Promise<GoogleConnectionFromSync> {
  const result = await client.listConnections(principal);
  if (result.ok) {
    const { connections } = result.value;
    const primary = selectPrimaryGoogleConnection(connections);
    return {
      connectionState: toGoogleConnectionState(connections),
      connection: primary ? toGoogleSyncConnectionSummary(primary) : null,
    };
  }

  logger.warn(
    `Sync connection status unavailable (${result.error.kind}); reporting ATTENTION ` +
      `[correlationId=${result.error.correlationId}]`,
  );
  return { connectionState: "ATTENTION", connection: null };
}

/** @deprecated Prefer resolveGoogleConnectionFromSync (keeps summary). */
export async function resolveGoogleConnectionStateFromSync(
  client: Pick<SyncServiceClient, "listConnections">,
  principal: SyncPrincipal,
): Promise<GoogleConnectionState> {
  const { connectionState } = await resolveGoogleConnectionFromSync(
    client,
    principal,
  );
  return connectionState;
}
