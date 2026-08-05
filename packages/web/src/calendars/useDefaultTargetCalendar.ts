import { useMemo } from "react";
import { type Calendar } from "@core/types/calendar.contracts";
import {
  selectGoogleSyncConnections,
  useUserMetadataStore,
} from "@web/auth/state/user-metadata.store";
import { getDefaultTargetCalendar } from "@web/calendars/calendar.util";
import { useDefaultCalendarId } from "@web/calendars/default-calendar.store";

/**
 * The calendar a new event should land on: the user's chosen default when
 * it is still usable, else the primary calendar of the oldest-connected
 * account, else the local calendar.
 *
 * Wraps getDefaultTargetCalendar with the two reactive inputs every caller
 * needs - the stored preference and the connected accounts in connection
 * order - so a change to either re-renders the caller.
 */
export function useDefaultTargetCalendar(
  calendars: Calendar[],
): Calendar | undefined {
  const preferredCalendarId = useDefaultCalendarId();
  const accountEmailOrder = useConnectedAccountEmails();

  return getDefaultTargetCalendar(calendars, {
    preferredCalendarId,
    accountEmailOrder,
  });
}

/** Connected account emails in connection order (oldest first). */
export function useConnectedAccountEmails(): string[] {
  const connections = useUserMetadataStore(selectGoogleSyncConnections);

  return useMemo(
    () =>
      connections
        .map((connection) => connection.accountEmail)
        .filter((email): email is string => Boolean(email)),
    [connections],
  );
}
