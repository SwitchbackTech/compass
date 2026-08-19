import { type ConnectionId } from "@core/types/sync/identity.contracts";
import { type AccessTokenSource } from "@sync/domain/provider-write-ladder";
import { ProviderAuthError } from "@sync/providers/provider-auth.port";
import {
  type CalendarDiscovery,
  type ProviderCalendarAdapter,
  ProviderCalendarError,
} from "@sync/providers/provider-calendar.port";

export interface CalendarDiscoveryAuthRetryDeps {
  discovery: ProviderCalendarAdapter;
  custody: AccessTokenSource;
}

// Discover calendars, reminting the access token in-process if Google rejects
// the cached one (401 / authExpired). Same contract as listEventPageWithAuthRetry:
// a stale cache recovers without a job attempt; a revoked grant surfaces as
// ProviderAuthError so dispatch drops and the connection asks for reconnect.
export async function discoverCalendarsWithAuthRetry(
  deps: CalendarDiscoveryAuthRetryDeps,
  connectionId: ConnectionId,
  input: { accessToken: string; cursor?: string },
): Promise<{ discovery: CalendarDiscovery; accessToken: string }> {
  try {
    return {
      discovery: await deps.discovery.discoverCalendars(input),
      accessToken: input.accessToken,
    };
  } catch (error) {
    if (!isAuthExpired(error)) throw error;
  }

  await deps.custody.invalidateAccessToken(connectionId);
  const accessToken = await deps.custody.getValidAccessToken(connectionId);
  try {
    return {
      discovery: await deps.discovery.discoverCalendars({
        ...input,
        accessToken,
      }),
      accessToken,
    };
  } catch (error) {
    if (!isAuthExpired(error)) throw error;
    throw new ProviderAuthError(
      "authorizationRevoked",
      "Google rejected a freshly minted access token",
      { cause: error },
    );
  }
}

function isAuthExpired(error: unknown): error is ProviderCalendarError {
  return (
    error instanceof ProviderCalendarError && error.reason === "authExpired"
  );
}
