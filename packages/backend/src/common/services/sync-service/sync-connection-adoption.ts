import { Logger } from "@core/logger/winston.logger";
import {
  type GoogleConnectionAdoptionRequest,
  type GoogleConnectionAdoptionResponse,
  type ProviderAccountFacts,
  type ProviderConnection,
  type ProviderConnectionAdoptionRequest,
  type ProviderConnectionAdoptionResponse,
} from "@core/types/sync/connection.contracts";
import {
  type ProviderKind,
  providerDisplayName,
} from "@core/types/sync/identity.contracts";
import {
  type SyncPrincipal,
  type SyncServiceClient,
} from "./sync-service.client";
import { unwrapSyncResult } from "./unwrap-sync-result";

const logger = Logger("app:sync-connection-adoption");
const googleLogMessage = "Sync Google authorization adoption failed";
const googleUserMessage = "Failed to connect Google Calendar";

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
    logMessage: googleLogMessage,
    userMessage: googleUserMessage,
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
    { logger, logMessage: googleLogMessage, userMessage: googleUserMessage },
  );
}

export async function adoptProviderAuthorization(
  client: Pick<
    SyncServiceClient,
    "adoptProviderAuthorization" | "listConnections"
  >,
  principal: SyncPrincipal,
  request: Omit<ProviderConnectionAdoptionRequest, "credential"> & {
    refreshToken: string;
    provider: ProviderKind;
  },
): Promise<ProviderConnectionAdoptionResponse> {
  const logMessage = `Sync ${request.provider} authorization adoption failed`;
  const userMessage = `Failed to connect ${providerDisplayName(request.provider)} Calendar`;
  const existing = unwrapSyncResult(await client.listConnections(principal), {
    logger,
    logMessage,
    userMessage,
  });
  if (
    existing.connections.some(
      (connection) =>
        connection.provider === request.provider &&
        isLiveSameAccount(connection, request.account),
    )
  ) {
    return {};
  }

  return unwrapSyncResult(
    await client.adoptProviderAuthorization(principal, request),
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
