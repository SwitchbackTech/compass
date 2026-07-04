import { type Params_Events } from "@core/types/event.types";
import { type EventRepositorySource } from "@web/common/repositories/event/event.repository.factory";

export const eventQueryKeys = {
  all: ["events"] as const,
  /**
   * Prefix builder for scoped invalidation/removal. Matches every cached entry
   * for a read scope regardless of source/date-range, e.g. `scope("week")` →
   * `["events", "week"]`.
   */
  scope: (scope: "day" | "week" | "someday") =>
    [...eventQueryKeys.all, scope] as const,
  day: (args: {
    source: EventRepositorySource;
    startDate: string;
    endDate: string;
  }) =>
    [
      ...eventQueryKeys.all,
      "day",
      {
        source: args.source,
        startDate: args.startDate,
        endDate: args.endDate,
        someday: false,
      },
    ] as const,
  list: (args: {
    source: EventRepositorySource;
    scope: "week" | "someday";
    params: Partial<Params_Events>;
  }) =>
    [
      ...eventQueryKeys.all,
      args.scope,
      {
        source: args.source,
        startDate: args.params.startDate,
        endDate: args.params.endDate,
        someday: args.params.someday,
      },
    ] as const,
};
