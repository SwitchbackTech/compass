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
 * unwrapSyncResult. The client now reports conflict (409 passive mode) and
 * notFound (404 reconnect-not-found) kinds — visible in the server-side log
 * line — but the browser response stays the single opaque 503 until the
 * reconnect UI can act on the distinction.
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
