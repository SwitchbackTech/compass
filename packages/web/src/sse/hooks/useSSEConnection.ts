import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useSession } from "@web/auth/compass/session/useSession";
import { useUser } from "@web/auth/compass/user/hooks/useUser";
import { calendarQueryKeys } from "@web/calendars/calendar.query";
import { eventQueryKeys } from "@web/events/queries/event.query.keys";
import { closeStream, openStream } from "../client/sse.client";

export const useSSEConnection = () => {
  const { authenticated } = useSession();
  const { userId } = useUser();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (authenticated || userId) {
      openStream();
      // A (re)opened stream may have missed changes while disconnected;
      // reconcile once rather than trusting the gap is empty (B10).
      void queryClient.invalidateQueries({ queryKey: eventQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: calendarQueryKeys.all });
    } else {
      closeStream();
    }
  }, [authenticated, userId, queryClient]);
};
