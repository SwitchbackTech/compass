import { useMutationState } from "@tanstack/react-query";
import { useRef } from "react";
import { eventMutationKeys } from "./event.mutation.keys";

const idsFromVariables = (variables: unknown): string[] => {
  if (Array.isArray(variables)) {
    return variables.flatMap(idsFromVariables);
  }
  if (!variables || typeof variables !== "object" || !("_id" in variables)) {
    return [];
  }
  const id = variables._id;
  return typeof id === "string" ? [id] : [];
};

export function usePendingEventIds() {
  const pendingVariables = useMutationState({
    filters: { mutationKey: eventMutationKeys.all, status: "pending" },
    select: (mutation) => mutation.state.variables,
  });
  const nextIds = [...new Set(pendingVariables.flatMap(idsFromVariables))];
  const stableIds = useRef<string[]>([]);
  if (
    stableIds.current.length !== nextIds.length ||
    stableIds.current.some((id, index) => id !== nextIds[index])
  ) {
    stableIds.current = nextIds;
  }
  return stableIds.current;
}

export function useIsEventPending(eventId?: string) {
  const pendingEventIds = usePendingEventIds();
  return Boolean(eventId && pendingEventIds.includes(eventId));
}
