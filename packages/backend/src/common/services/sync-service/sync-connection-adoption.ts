import { Logger } from "@core/logger/winston.logger";
import {
  type GoogleConnectionAdoptionRequest,
  type GoogleConnectionAdoptionResponse,
  type ProviderAccountFacts,
  type ProviderConnection,
} from "@core/types/sync/connection.contracts";
import { AuthError } from "@backend/common/errors/auth/auth.errors";
import { error } from "@backend/common/errors/handlers/error.handler";
import {
  type SyncPrincipal,
  type SyncServiceClient,
} from "./sync-service.client";

const logger = Logger("app:sync-connection-adoption");

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
  const existing = await client.listConnections(principal);
  if (!existing.ok) {
    throwUnavailable(existing.error.kind, existing.error.correlationId);
  }
  if (
    existing.value.connections.some((connection) =>
      isLiveSameAccount(connection, request.account),
    )
  ) {
    return {};
  }

  const result = await client.adoptGoogleAuthorization(principal, request);
  if (result.ok) return result.value;

  throwUnavailable(result.error.kind, result.error.correlationId);
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

function throwUnavailable(kind: string, correlationId: string): never {
  logger.warn(
    `Sync Google authorization adoption failed (${kind}) ` +
      `[correlationId=${correlationId}]`,
  );
  throw error(
    AuthError.SyncConnectionUnavailable,
    "Failed to connect Google Calendar",
  );
}
