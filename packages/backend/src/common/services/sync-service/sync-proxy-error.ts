import { Status } from "@core/errors/status.codes";
import { AuthError } from "@backend/common/errors/auth/auth.errors";
import { error } from "@backend/common/errors/handlers/error.handler";
import { type SyncClientErrorKind } from "@backend/common/services/sync-service/sync-service.client";
import { eventMutationError } from "@backend/event/event.error";

/**
 * Map a failed Sync HTTP call on a read/proxy route into a real HTTP status.
 * Never returns Status.UNSURE (600). Timeout/unavailable → 503; other Sync
 * failures → 502. Clients get a retryable service error without Sync-internal
 * details leaking beyond the kind already in `userMessage`.
 */
export function throwSyncProxyFailure(
  kind: SyncClientErrorKind,
  userMessage: string,
): never {
  if (kind === "timeout" || kind === "unavailable") {
    throw error(AuthError.SyncConnectionUnavailable, userMessage);
  }
  throw error(
    {
      description: "Sync service returned an unexpected failure",
      status: Status.BAD_GATEWAY,
      isOperational: true,
      code: "SYNC_PROXY_FAILURE",
    },
    userMessage,
  );
}

/**
 * Map a failed Sync command submit on an event mutation route. Timeout and
 * unavailable stay PROVIDER_FAILURE (retryable 502) because Sync may already
 * have applied the write. Other kinds are also PROVIDER_FAILURE so clients
 * never see GenericError.NotSure / HTTP 600.
 */
export function throwSyncCommandSubmitFailure(
  kind: SyncClientErrorKind,
  detail: string,
): never {
  if (kind === "timeout" || kind === "unavailable") {
    throw eventMutationError(
      "PROVIDER_FAILURE",
      `Sync command ${kind}; the mutation may already be applied`,
    );
  }
  throw eventMutationError(
    "PROVIDER_FAILURE",
    `Failed to submit command to sync (${detail})`,
  );
}
