import { type Calendar } from "@core/types/calendar.contracts";
import {
  isAccountReconnectRequired,
  isConnectionReconnectRequired,
} from "@web/auth/google/state/google.reconnect.state";
import {
  selectGoogleSyncConnections,
  useUserMetadataStore,
} from "@web/auth/state/user-metadata.store";

/**
 * True when this calendar's Google account needs reconnect, whether the
 * session override was keyed by email or by connection id.
 */
export function isCalendarReconnectRequired(
  calendar: Pick<Calendar, "accountEmail"> | null | undefined,
): boolean {
  if (!calendar?.accountEmail) return false;
  if (isAccountReconnectRequired(calendar.accountEmail)) return true;

  const connection = selectGoogleSyncConnections(
    useUserMetadataStore.getState(),
  ).find((entry) => entry.accountEmail === calendar.accountEmail);
  return isConnectionReconnectRequired(connection?.id);
}
