import { type SyncCommandFailureReason } from "@core/types/sync/command.contracts";
import { type ConnectionId } from "@core/types/sync/identity.contracts";
import { ProviderAuthError } from "@sync/providers/provider-auth.port";
import { ProviderWriteError } from "@sync/providers/provider-event-writer.port";

// The slice of credential custody the executor needs — a valid access token for
// a connection, plus discard of a provider-invalidated grant. Narrow so tests
// pass a plain fake; CredentialCustody satisfies it structurally.
export interface AccessTokenSource {
  getValidAccessToken(connectionId: ConnectionId): Promise<string>;
  discardRevoked(connectionId: ConnectionId): Promise<void>;
  invalidateAccessToken(connectionId: ConnectionId): Promise<void>;
}

/**
 * Shared classification for the auth + provider-write ladders duplicated across
 * provider-command executors. Callers decide how to turn a stop into a command
 * outcome (failCommand vs revertAndFail vs return pending).
 */
export type ProviderWriteStop =
  | { kind: "pending" }
  | { kind: "failed"; reason: SyncCommandFailureReason };

export type AccessTokenResult =
  | { ok: true; accessToken: string }
  | { ok: false; stop: ProviderWriteStop };

export type ProviderWriteAttempt<T> =
  | { ok: true; value: T }
  | { ok: false; stop: ProviderWriteStop };

/**
 * Resolve a valid access token. Transient refresh failures leave the command
 * pending; revoked/missing credentials are terminal authorizationRevoked.
 */
export async function resolveAccessToken(
  custody: AccessTokenSource,
  connectionId: ConnectionId,
): Promise<AccessTokenResult> {
  try {
    const accessToken = await custody.getValidAccessToken(connectionId);
    return { ok: true, accessToken };
  } catch (error) {
    if (
      error instanceof ProviderAuthError &&
      error.reason === "refreshFailed"
    ) {
      return { ok: false, stop: { kind: "pending" } };
    }
    return {
      ok: false,
      stop: { kind: "failed", reason: "authorizationRevoked" },
    };
  }
}

/**
 * Run a provider write/read that throws ProviderWriteError. Transient → pending;
 * other ProviderWriteError reasons → failed with that reason; anything else
 * rethrows (programmer / unexpected).
 */
export async function runProviderWrite<T>(
  attempt: () => Promise<T>,
): Promise<ProviderWriteAttempt<T>> {
  try {
    return { ok: true, value: await attempt() };
  } catch (error) {
    if (error instanceof ProviderWriteError) {
      if (error.reason === "transient") {
        return { ok: false, stop: { kind: "pending" } };
      }
      return { ok: false, stop: { kind: "failed", reason: error.reason } };
    }
    throw error;
  }
}
