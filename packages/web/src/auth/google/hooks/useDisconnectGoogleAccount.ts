import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { AuthApi } from "@web/api/auth.api";
import { refreshUserMetadata } from "@web/auth/compass/user/util/user-metadata.util";
import { calendarQueryKeys } from "@web/calendars/calendar.query";
import { ACCOUNT_DISCONNECTED_TOAST_ID, GOOGLE_REVOKED_TOAST_ID } from "@web/common/constants/toast.constants";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import { showStatusToast } from "@web/common/utils/toast/status-toast.util";
import { getToast } from "@web/common/utils/toast/toast.port";
import { eventQueryKeys } from "@web/events/queries/event.query.keys";

/**
 * Removes one account's calendars and events from Compass. The account's
 * Google data, and the user's other connections, are untouched. Tracks at
 * most one in-flight disconnect at a time by connection id, since a caller
 * (the manage-accounts dialog) may list several accounts sharing one hook
 * instance.
 */
export function useDisconnectGoogleAccount(): {
  disconnect: (connectionId: string, accountEmail: string) => Promise<void>;
  disconnectingId: string | null;
} {
  const queryClient = useQueryClient();
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

  const disconnect = useCallback(
    (connectionId: string, accountEmail: string) => {
      setDisconnectingId(connectionId);
      return AuthApi.disconnectGoogleConnection(connectionId)
        .then(async () => {
          // Show success confirmation and dismiss any stale reconnect warning.
          getToast().dismiss(GOOGLE_REVOKED_TOAST_ID);
          showStatusToast(
            ACCOUNT_DISCONNECTED_TOAST_ID,
            `Disconnected ${accountEmail}`,
          );

          // The account's calendars and its events both disappear, and the
          // remaining connections are what drive the sidebar's sections.
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: calendarQueryKeys.all }),
            queryClient.invalidateQueries({ queryKey: eventQueryKeys.all }),
            refreshUserMetadata({ force: true }),
          ]);
        })
        .catch(() => {
          showErrorToast(
            `We couldn't disconnect ${accountEmail}. Please try again in a moment.`,
          );
        })
        .finally(() => {
          setDisconnectingId(null);
        });
    },
    [queryClient],
  );

  return { disconnect, disconnectingId };
}
