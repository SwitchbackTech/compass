import { QueryClient } from "@tanstack/react-query";
import { eventMutationKeys } from "@web/events/mutations/event.mutation.keys";
import { invalidateEventQueriesUnlessMutating } from "./event.query.invalidation";
import { eventQueryKeys } from "./event.query.keys";
import { describe, expect, mock, test } from "bun:test";

describe("invalidateEventQueriesUnlessMutating", () => {
  test("invalidates immediately when no event write is pending", () => {
    const queryClient = new QueryClient();
    const invalidateQueries = mock(() => Promise.resolve());
    queryClient.invalidateQueries = invalidateQueries;

    invalidateEventQueriesUnlessMutating(queryClient, eventQueryKeys.all);

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: eventQueryKeys.all,
    });
  });

  test("leaves the optimistic cache alone while an event write is pending", () => {
    const queryClient = new QueryClient();
    const invalidateQueries = mock(() => Promise.resolve());
    queryClient.invalidateQueries = invalidateQueries;
    queryClient
      .getMutationCache()
      .build(queryClient, {
        mutationKey: eventMutationKeys.operation("replace"),
        mutationFn: () => new Promise(() => undefined),
      })
      .execute(undefined);

    invalidateEventQueriesUnlessMutating(queryClient, eventQueryKeys.all);

    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});
