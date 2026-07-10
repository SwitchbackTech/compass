import { type Schema_Event } from "@core/types/event.types";
import { type Response_HttpPaginatedSuccess } from "@web/common/types/api.types";
import { type EventRepositorySource } from "@web/events/repositories/event.repository.factory";

export type NormalizedEventQueryData = {
  ids: string[];
  entities: Record<string, Schema_Event>;
};

export type SomedayEventQueryData = NormalizedEventQueryData & {
  pagination: Response_HttpPaginatedSuccess<Schema_Event[]>;
};

export type EventQueryData = NormalizedEventQueryData | SomedayEventQueryData;

export type EventQueryScope = "day" | "week" | "someday";

export type EventQueryKeyMetadata = {
  source: EventRepositorySource;
  startDate?: string;
  endDate?: string;
  someday: boolean;
};

export type EventQueryKey = readonly [
  "events",
  EventQueryScope,
  EventQueryKeyMetadata,
];
