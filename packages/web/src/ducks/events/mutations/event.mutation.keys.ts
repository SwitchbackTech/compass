export type EventMutationOperation =
  | "create"
  | "edit"
  | "delete"
  | "convert-to-someday"
  | "convert-to-calendar"
  | "delete-someday"
  | "reorder-someday";

export const eventMutationKeys = {
  all: ["events", "mutation"] as const,
  operation: (operation: EventMutationOperation) =>
    [...eventMutationKeys.all, operation] as const,
};
