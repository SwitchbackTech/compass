import { type EventId } from "@core/types/domain-primitives";
import { type Event } from "@core/types/event.contracts";
import {
  type CreateEventInput,
  type EventListQuery,
  EventListResponseSchema,
  EventResponseSchema,
  type ReplaceEventInput,
} from "@core/types/event-command.contracts";
import { BaseApi } from "@web/api/base/base.api";

// Every response is parsed with the core schemas (B4) — the client never
// trusts an unparsed payload, matching the strict-parsed ingress on the
// backend.

function buildListQueryString(query: EventListQuery): string {
  const params = new URLSearchParams();
  params.set("kind", query.kind);
  params.set("start", query.start);
  params.set("end", query.end);
  if (query.priorities.length > 0) {
    params.set("priorities", query.priorities.join(","));
  }

  return params.toString();
}

const EventApi = {
  list: async (query: EventListQuery): Promise<Event[]> => {
    const response = await BaseApi.get<unknown>(
      `/event?${buildListQueryString(query)}`,
    );
    return EventListResponseSchema.parse(response.data).events;
  },

  getById: async (id: EventId): Promise<Event> => {
    const response = await BaseApi.get<unknown>(`/event/${id}`);
    return EventResponseSchema.parse(response.data).event;
  },

  create: async (input: CreateEventInput): Promise<Event> => {
    const response = await BaseApi.post<unknown>(`/event`, input);
    return EventResponseSchema.parse(response.data).event;
  },

  replace: async (id: EventId, input: ReplaceEventInput): Promise<Event> => {
    const response = await BaseApi.put<unknown>(`/event/${id}`, input);
    return EventResponseSchema.parse(response.data).event;
  },

  delete: (id: EventId, scope: "this" | "thisAndFollowing" | "all") => {
    return BaseApi.delete<void>(`/event/${id}?scope=${scope}`);
  },
};

export { EventApi };
