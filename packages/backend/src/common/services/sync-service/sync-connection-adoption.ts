import { Logger } from "@core/logger/winston.logger";
import {
  type GoogleConnectionAdoptionRequest,
  type GoogleConnectionAdoptionResponse,
  type ProviderAccountFacts,
  type ProviderConnection,
} from "@core/types/sync/connection.contracts";
import {
  type SyncPrincipal,
  type SyncServiceClient,
} from "./sync-service.client";
import { unwrapSyncResult } from "./unwrap-sync-result";

const logger = Logger("app:sync-connection-adoption");
const logMessage = "Sync Google authorization adoption failed";
const userMessage = "Failed to connect Google Calendar";

// Make the one-click Google sign-in authorization durable in Sync. On failure
// sign-in fails visibly rather than creating a session that looks connected but
// can never import calendars.
export async function adoptGoogleAuthorization(
  client: Pick<
    SyncServiceClient,
    "adoptGoogleAuthorization" | "listConnections"
  >,
  principal: SyncPrincipal,
  request: Omit<GoogleConnectionAdoptionRequest, "credential"> & {
    refreshToken: string;
  },
): Promise<GoogleConnectionAdoptionResponse> {
  const existing = unwrapSyncResult(await client.listConnections(principal), {
    logger,
    logMessage,
    userMessage,
  });
  if (
    existing.connections.some((connection) =>
      isLiveSameAccount(connection, request.account),
    )
  ) {
    return {};
  }

  return unwrapSyncResult(
    await client.adoptGoogleAuthorization(principal, request),
    { logger, logMessage, userMessage },
  );
}

function isLiveSameAccount(
  connection: ProviderConnection,
  account: ProviderAccountFacts,
): boolean {
  return (
    connection.account.providerAccountId === account.providerAccountId &&
    !["actionRequired", "disconnected"].includes(connection.state)
  );
}
