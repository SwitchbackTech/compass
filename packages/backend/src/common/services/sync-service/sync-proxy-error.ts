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

// Map a failed Sync command submit. Never GenericError.NotSure / HTTP 600.
// Timeout/unavailable are our own backpressure rather than a provider verdict,
// so they mirror the read path's 503 instead of surfacing as a 502 (the two
// paths disagreed until 2026-08-23, which made a Sync throttle look like a bad
// gateway in the logs). Both stay retryable: Sync may already have applied the
// write, so a caller MUST retry with the SAME idempotency key.
export function throwSyncCommandSubmitFailure(
  kind: SyncClientErrorKind,
): never {
  if (kind === "timeout" || kind === "unavailable") {
    throw eventMutationError(
      "SYNC_UNAVAILABLE",
      `Sync command ${kind}; the mutation may already be applied`,
    );
  }
  throw eventMutationError(
    "PROVIDER_FAILURE",
    `Failed to submit command to sync (${kind})`,
  );
}
