import { Logger } from "@core/logger/winston.logger";
import {
  type ConnectionBeginRequest,
  type ConnectionBeginResponse,
} from "@core/types/sync/connection.contracts";
import {
  type SyncPrincipal,
  type SyncServiceClient,
} from "./sync-service.client";
import { unwrapSyncResult } from "./unwrap-sync-result";

const logger = Logger("app:sync-connection-begin");

/**
 * Ask the sync service to start an OAuth authorization flow and return the
 * consent URL the browser should be sent to.
 *
 * Any client failure surfaces as the standard opaque 503 via
 * unwrapSyncResult. The distinctions the sync service makes (409 passive
 * mode, 404 reconnect-not-found) are not yet actionable by the browser; when
 * the reconnect UI is wired, this can grow more specific mappings.
 */
export async function beginSyncConnection(
  client: Pick<SyncServiceClient, "beginConnection">,
  principal: SyncPrincipal,
  request: ConnectionBeginRequest,
): Promise<ConnectionBeginResponse> {
  return unwrapSyncResult(await client.beginConnection(principal, request), {
    logger,
    logMessage: "Sync begin-connection failed",
    userMessage: "Failed to start Google connection",
  });
}
