import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { AuthApi } from "@web/api/auth.api";
import { refreshUserMetadata } from "@web/auth/compass/user/util/user-metadata.util";
import { calendarQueryKeys } from "@web/calendars/calendar.query";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
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
