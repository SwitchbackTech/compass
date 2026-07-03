import { type EventRepositorySource } from "@web/common/repositories/event/event.repository.factory";

export const eventQueryKeys = {
  all: ["events"] as const,
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
};
