import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type DemoEventsRange,
  hasDemoEvents,
} from "@web/events/demo-events.util";
import { eventQueryKeys } from "@web/events/queries/event.query.keys";
import { useEventRepositorySource } from "@web/events/repositories/event.repository.source.store";

export function useDemoEventsPresent(range?: DemoEventsRange): boolean {
  const queryClient = useQueryClient();
  const source = useEventRepositorySource();
  const [present, setPresent] = useState(false);
  const refreshGenerationRef = useRef(0);
  const rangeStart = range?.start;
  const rangeEnd = range?.end;

  const refresh = useCallback(() => {
    if (source !== "local") {
      refreshGenerationRef.current += 1;
      setPresent(false);
      return;
    }

    refreshGenerationRef.current += 1;
    const generation = refreshGenerationRef.current;
    const rangeArg =
      rangeStart !== undefined && rangeEnd !== undefined
        ? { start: rangeStart, end: rangeEnd }
        : undefined;
    void hasDemoEvents(rangeArg).then((result) => {
      if (generation === refreshGenerationRef.current) {
        setPresent(result);
      }
    });
  }, [rangeEnd, rangeStart, source]);

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
