import { type ProviderKind } from "@core/types/sync/identity.contracts";
import { toSyncPrincipal } from "@backend/common/services/sync-service/sync-principal";
import { type SyncServiceClient } from "@backend/common/services/sync-service/sync-service.client";

/**
 * Best-effort provider kind for the calendar targeted by a mutation. Used only
 * to enrich client-facing error copy; a miss falls back to neutral wording.
 */
export async function resolveProviderForCalendarId(
  client: SyncServiceClient,
  userId: string,
  calendarId: string,
): Promise<ProviderKind | undefined> {
  try {
    const principal = toSyncPrincipal(userId);
    const [calendarsResult, connectionsResult] = await Promise.all([
      client.listCalendars(principal, { activeOnly: true }),
      client.listConnections(principal),
    ]);
    if (!calendarsResult.ok || !connectionsResult.ok) return undefined;

    const calendar = calendarsResult.value.calendars.find(
      (entry) => entry.id === calendarId,
    );
    if (!calendar) return undefined;

    const connection = connectionsResult.value.connections.find(
      (entry) => entry.id === calendar.connectionId,
    );
    return connection?.provider;
  } catch {
    // Enrichment only: a lookup failure must not mask the underlying mutation
    // error the caller is about to surface.
    return undefined;
  }
}
