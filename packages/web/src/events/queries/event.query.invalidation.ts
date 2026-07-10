import { type QueryClient, type QueryKey } from "@tanstack/react-query";
import { eventMutationKeys } from "@web/events/mutations/event.mutation.keys";

export const invalidateEventQueriesUnlessMutating = (
  queryClient: QueryClient,
  queryKey: QueryKey,
) => {
  if (queryClient.isMutating({ mutationKey: eventMutationKeys.all }) > 0) {
    return;
  }
  void queryClient.invalidateQueries({ queryKey });
};
