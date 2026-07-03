import { useMutationState } from "@tanstack/react-query";
import { useRef } from "react";
import {
  type EventMutationOperation,
  eventMutationKeys,
} from "./event.mutation.keys";

const asString = (value: unknown): string[] =>
  typeof value === "string" ? [value] : [];

// Top-level `{ _id }` payloads: create, edit, delete, delete-someday.
const topLevelId = (variables: unknown): string[] => {
  if (!variables || typeof variables !== "object" || !("_id" in variables)) {
    return [];
  }
  return asString((variables as { _id: unknown })._id);
};

// Convert payloads nest the id under `{ event: { _id } }`, so the old
// top-level `"_id" in variables` sniff missed them entirely.
const convertEventId = (variables: unknown): string[] => {
  if (!variables || typeof variables !== "object" || !("event" in variables)) {
    return [];
  }
  const event = (variables as { event: unknown }).event;
  if (!event || typeof event !== "object" || !("_id" in event)) return [];
  return asString((event as { _id: unknown })._id);
};

// Derive the event ids a given in-flight mutation should mark as pending.
// Keyed on the operation (read from the mutation key) so we read each
// operation's known variable shape instead of guessing from the payload.
const idsForOperation = (
  operation: EventMutationOperation,
  variables: unknown,
): string[] => {
  switch (operation) {
    case "convert-to-someday":
    case "convert-to-calendar":
      return convertEventId(variables);
    case "reorder-someday":
      // Deliberate: a reorder repositions the entire Someday list. Marking
      // every reordered id pending would disable editing/deleting all of
      // them, so a reorder blocks nothing at the per-event level.
      return [];
    default:
      return topLevelId(variables);
  }
};

const operationFromKey = (
  mutationKey: unknown,
): EventMutationOperation | null => {
  if (!Array.isArray(mutationKey) || mutationKey.length < 3) return null;
  const [namespace, kind, operation] = mutationKey;
  if (
    namespace !== eventMutationKeys.all[0] ||
    kind !== eventMutationKeys.all[1]
  ) {
    return null;
  }
  return (operation as EventMutationOperation) ?? null;
};

export function usePendingEventIds() {
  const pending = useMutationState({
    filters: { mutationKey: eventMutationKeys.all, status: "pending" },
    select: (mutation) => ({
      operation: operationFromKey(mutation.options.mutationKey),
      variables: mutation.state.variables,
    }),
  });
  const nextIds = [
    ...new Set(
      pending.flatMap(({ operation, variables }) =>
        operation ? idsForOperation(operation, variables) : [],
      ),
    ),
  ];
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
