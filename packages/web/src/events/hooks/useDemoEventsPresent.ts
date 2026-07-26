import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { hasDemoEvents } from "@web/events/demo-events.util";
import { eventQueryKeys } from "@web/events/queries/event.query.keys";
import { useEventRepositorySource } from "@web/events/repositories/event.repository.source.store";

export function useDemoEventsPresent(): boolean {
  const queryClient = useQueryClient();
  const source = useEventRepositorySource();
  const [present, setPresent] = useState(false);
  const refreshGenerationRef = useRef(0);

  const refresh = useCallback(() => {
    if (source !== "local") {
      refreshGenerationRef.current += 1;
      setPresent(false);
      return;
    }

    refreshGenerationRef.current += 1;
    const generation = refreshGenerationRef.current;
    void hasDemoEvents()
      .then((result) => {
        if (generation === refreshGenerationRef.current) {
          setPresent(result);
        }
      })
      .catch(() => {
        // IndexedDB probe is best-effort; treat failures as "no demo events"
        // rather than an unhandledrejection.
        if (generation === refreshGenerationRef.current) {
          setPresent(false);
        }
      });
  }, [source]);

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
