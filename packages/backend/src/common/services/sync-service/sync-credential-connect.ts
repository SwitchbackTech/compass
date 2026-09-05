import { Status } from "@core/errors/status.codes";
import { Logger } from "@core/logger/winston.logger";
import {
  type ConnectionBeginConnectedResponse,
  type ConnectionCredentialRequest,
  ConnectionCredentialRequestSchema,
} from "@core/types/sync/connection.contracts";
import { AuthError } from "@backend/common/errors/auth/auth.errors";
import { error } from "@backend/common/errors/handlers/error.handler";
import { throwSyncProxyFailure } from "./sync-proxy-error";
import {
  type SyncPrincipal,
  type SyncServiceClient,
} from "./sync-service.client";

const logger = Logger("app:sync-credential-connect");

export const INVALID_APPLE_CREDENTIAL_MESSAGE =
  "That email or app-specific password was not accepted";

/**
 * Forward a sealed Apple credential envelope to Sync and return the connected
 * connection id. Maps Sync invalidCredential (401) to a 400 with stable copy;
 * throttling and other operational failures surface as 503.
 */
export async function connectSyncCredential(
  client: Pick<SyncServiceClient, "createCredentialConnection">,
  principal: SyncPrincipal,
  request: ConnectionCredentialRequest,
): Promise<ConnectionBeginConnectedResponse> {
  const parsed = ConnectionCredentialRequestSchema.parse(request);
  const result = await client.createCredentialConnection(principal, parsed);
  if (result.ok) {
    return {
      kind: "connected",
      connectionId: result.value.connectionId,
    };
  }

  const { kind, status, correlationId, detail } = result.error;
  if (status === 401) {
    throw error(
      {
        description: INVALID_APPLE_CREDENTIAL_MESSAGE,
        status: Status.BAD_REQUEST,
        isOperational: true,
        code: "INVALID_CREDENTIAL",
      },
      "Connect Failed",
    );
  }
  if (kind === "timeout" || kind === "unavailable") {
    logger.warn(
      `Sync credential connect failed (${kind}) [correlationId=${correlationId}]` +
        (detail ? ` ${detail}` : ""),
    );
    throw error(
      {
        ...AuthError.SyncConnectionUnavailable,
        description: INVALID_APPLE_CREDENTIAL_MESSAGE,
      },
      "Connect Failed",
    );
  }

  logger.warn(
    `Sync credential connect failed (${kind}) [correlationId=${correlationId}]` +
      (detail ? ` ${detail}` : ""),
  );
  throwSyncProxyFailure(kind, "Failed to connect calendar account", detail);
}
