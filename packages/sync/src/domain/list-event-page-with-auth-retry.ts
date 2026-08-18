import { type ConnectionId } from "@core/types/sync/identity.contracts";
import { type AccessTokenSource } from "@sync/domain/provider-write-ladder";
import { ProviderAuthError } from "@sync/providers/provider-auth.port";
import {
  type ProviderEventPage,
  ProviderEventReadError,
  type ProviderEventReader,
  type ProviderEventReadInput,
} from "@sync/providers/provider-event-reader.port";

export interface EventPageAuthRetryDeps {
  reader: ProviderEventReader;
  custody: AccessTokenSource;
}

// Read one event page, reminting the access token in-process if Google rejects
// the cached one (401 / authExpired).
//
// Incremental pulls fetch a token once, then call events.list. A stale cached
// token (clock skew, Google expiry before our stored expiresAt) used to throw
// out to the job worker: each attempt logged "Sync job engine failed", retried
// with backoff, and — until the cache was invalidated — replayed the same
// rejected token. A dead grant (invalid_grant on refresh) still burned the
// ladder as ProviderEventReadError(transient) before #2754, then as one error
// plus a delayed retry after it.
//
// Force-refresh here so a stale token recovers without a job attempt or a
// PostHog error, and a revoked grant surfaces as ProviderAuthError on this
// attempt so dispatch drops the job and the connection asks for reconnect.
export async function listEventPageWithAuthRetry(
  deps: EventPageAuthRetryDeps,
  connectionId: ConnectionId,
  input: ProviderEventReadInput,
): Promise<{ page: ProviderEventPage; accessToken: string }> {
  try {
    return {
      page: await deps.reader.listEventPage(input),
      accessToken: input.accessToken,
    };
  } catch (error) {
    if (!isAuthExpired(error)) throw error;
  }

  await deps.custody.invalidateAccessToken(connectionId);
  const accessToken = await deps.custody.getValidAccessToken(connectionId);
  try {
    return {
      page: await deps.reader.listEventPage({ ...input, accessToken }),
      accessToken,
    };
  } catch (error) {
    if (!isAuthExpired(error)) throw error;
    // A token minted just now was still rejected: this is not a stale cache.
    // Treat it as a dead grant so dispatch drops instead of retrying 20 times.
    throw new ProviderAuthError(
      "authorizationRevoked",
      "Google rejected a freshly minted access token",
      { cause: error },
    );
  }
}

function isAuthExpired(error: unknown): error is ProviderEventReadError {
  return (
    error instanceof ProviderEventReadError && error.reason === "authExpired"
  );
}
