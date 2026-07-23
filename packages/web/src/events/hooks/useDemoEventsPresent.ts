import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { hasDemoEvents } from "@web/events/demo-events.util";
import { eventQueryKeys } from "@web/events/queries/event.query.keys";

export function useDemoEventsPresent(): boolean {
  const queryClient = useQueryClient();
  const [present, setPresent] = useState(false);

  const refresh = useCallback(() => {
    void hasDemoEvents().then(setPresent);
  }, []);

  useEffect(() => {
    refresh();

    return queryClient.getQueryCache().subscribe((event) => {
      if (
        event.type === "updated" &&
        Array.isArray(event.query.queryKey) &&
        event.query.queryKey[0] === eventQueryKeys.all[0]
      ) {
        refresh();
      }
    });
  }, [queryClient, refresh]);

  return present;
}
