import { Status } from "@core/errors/status.codes";
import { AuthError } from "@backend/common/errors/auth/auth.errors";
import { error } from "@backend/common/errors/handlers/error.handler";
import { type SyncClientErrorKind } from "@backend/common/services/sync-service/sync-service.client";
import { eventMutationError } from "@backend/event/event.error";

// Map a failed Sync HTTP call on a read/proxy route into a real HTTP status.
// Never Status.UNSURE (600). Timeout/unavailable → 503; other failures → 502.
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

// Map a failed Sync command submit. Always PROVIDER_FAILURE so clients never
// see GenericError.NotSure / HTTP 600. Timeout/unavailable stay retryable
// because Sync may already have applied the write.
export function throwSyncCommandSubmitFailure(
  kind: SyncClientErrorKind,
): never {
  const message =
    kind === "timeout" || kind === "unavailable"
      ? `Sync command ${kind}; the mutation may already be applied`
      : `Failed to submit command to sync (${kind})`;
  throw eventMutationError("PROVIDER_FAILURE", message);
}
