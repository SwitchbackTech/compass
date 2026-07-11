export type EventMutationOperation =
  | "create"
  | "replace"
  | "delete"
  | "transition"
  | "reorder-someday";

export const eventMutationKeys = {
  all: ["events", "mutation"] as const,
  operation: (operation: EventMutationOperation) =>
    [...eventMutationKeys.all, operation] as const,
};
