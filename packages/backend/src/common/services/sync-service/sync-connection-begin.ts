import { Logger } from "@core/logger/winston.logger";
import {
  type ConnectionBeginRequest,
  type ConnectionBeginResponse,
} from "@core/types/sync/connection.contracts";
import { AuthError } from "@backend/common/errors/auth/auth.errors";
import { error } from "@backend/common/errors/handlers/error.handler";
import {
  type SyncPrincipal,
  type SyncServiceClient,
} from "./sync-service.client";

const logger = Logger("app:sync-connection-begin");

/**
 * Ask the sync service to start an OAuth authorization flow and return the
 * consent URL the browser should be sent to.
 *
 * Any client failure surfaces as a single 503 (SyncConnectionUnavailable): the
 * specific kind and correlation id are logged server-side, but nothing
 * sync-internal (status codes, identity) reaches the browser. The distinctions
 * the sync service makes (409 passive mode, 404 reconnect-not-found) are not yet
 * actionable by the browser; when the reconnect UI is wired, this can grow more
 * specific mappings.
 */
export async function beginSyncConnection(
  client: Pick<SyncServiceClient, "beginConnection">,
  principal: SyncPrincipal,
  request: ConnectionBeginRequest,
): Promise<ConnectionBeginResponse> {
  const result = await client.beginConnection(principal, request);
  if (result.ok) return result.value;

  logger.warn(
    `Sync begin-connection failed (${result.error.kind}) ` +
      `[correlationId=${result.error.correlationId}]`,
  );
  throw error(
    AuthError.SyncConnectionUnavailable,
    "Failed to start Google connection",
  );
}
