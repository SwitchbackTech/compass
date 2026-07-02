import { type Params_Events } from "@core/types/event.types";

export type EventRepositorySource = "api" | "indexeddb";

export const eventQueryKeys = {
  all: ["events"] as const,
  list: (source: EventRepositorySource, scope: string, params: Partial<Params_Events>) =>
    [
      ...eventQueryKeys.all,
      source,
      scope,
      params.startDate ?? null,
      params.endDate ?? null,
      params.someday ?? false,
      params.priorities ?? null,
      params.dontAdjustDates ?? false,
    ] as const,
};
