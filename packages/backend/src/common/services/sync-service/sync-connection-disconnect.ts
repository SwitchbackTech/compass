import { Logger } from "@core/logger/winston.logger";
import { AuthError } from "@backend/common/errors/auth/auth.errors";
import { error } from "@backend/common/errors/handlers/error.handler";
import {
  type SyncPrincipal,
  type SyncServiceClient,
} from "./sync-service.client";

const logger = Logger("app:sync-connection-disconnect");

/**
 * Ask the sync service to disconnect one of the caller's connections: revoke
 * the credential at the provider and mark the connection disconnected. The
 * principal's other connections are untouched.
 *
 * Any client failure surfaces as a single 503 (SyncConnectionUnavailable),
 * matching the begin/refresh delegations: the specific kind and correlation id
 * are logged server-side, and nothing sync-internal reaches the browser. A
 * connection the principal does not own is a sync-side not-found, which lands
 * here as the same opaque failure - correct, since a caller must not be able
 * to probe for other principals' connection ids.
 */
export async function disconnectSyncConnection(
  client: Pick<SyncServiceClient, "disconnectConnection">,
  principal: SyncPrincipal,
  connectionId: string,
): Promise<void> {
  const result = await client.disconnectConnection(principal, connectionId);
  if (result.ok) return;

  logger.warn(
    `Sync disconnect failed (${result.error.kind}) ` +
      `[correlationId=${result.error.correlationId}]`,
  );
  throw error(
    AuthError.SyncConnectionUnavailable,
    "Failed to disconnect Google account",
  );
}
