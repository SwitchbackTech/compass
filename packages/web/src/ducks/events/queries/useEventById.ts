import { useQueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { findEventInCache } from "./event.query.cache";

export function useEventById(eventId?: string) {
  const queryClient = useQueryClient();
  const queryCache = queryClient.getQueryCache();
  return useSyncExternalStore(
    (onStoreChange) => queryCache.subscribe(onStoreChange),
    () => (eventId ? findEventInCache(queryClient, eventId) : null),
    () => null,
  );
}
