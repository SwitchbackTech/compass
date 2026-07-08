import {
  type CompassCoreEvent,
  type Params_Events,
  type Payload_Order,
  type RecurringEventUpdateScope,
  type Schema_Event,
} from "@core/types/event.types";
import { type ApiResponse } from "@web/common/apis/api.types";
import { BaseApi } from "@web/common/apis/base/base.api";
import { type Response_HttpPaginatedSuccess } from "@web/common/types/api.types";
import {
  validateApiEvent,
  validateApiEvents,
} from "@web/common/validators/api.event.validator";

const EventApi = {
  // Outbound events are validated against the backend's own request schema
  // (see validateApiEvent), which also strips client-only fields the API
  // has no use for (grid layout state, local-store markers).
  create: (event: Schema_Event | Schema_Event[]) => {
    const body: CompassCoreEvent | CompassCoreEvent[] = Array.isArray(event)
      ? validateApiEvents(event)
      : validateApiEvent(event);
    return BaseApi.post<void>(`/event`, body);
  },
  delete: (_id: string, applyTo?: RecurringEventUpdateScope) => {
    return BaseApi.delete<void>(`/event/${_id}?applyTo=${applyTo}`);
  },
  edit: (
    _id: string,
    event: Schema_Event,
    params: { applyTo?: RecurringEventUpdateScope },
  ): Promise<ApiResponse<void>> => {
    const body: CompassCoreEvent = validateApiEvent(event);
    if (params?.applyTo) {
      return BaseApi.put<void>(`/event/${_id}?applyTo=${params.applyTo}`, body);
    }

    return BaseApi.put<void>(`/event/${_id}`, body);
  },
  get: (params: Params_Events) => {
    if (params.someday) {
      return BaseApi.get<Response_HttpPaginatedSuccess<Schema_Event[]>>(
        `/event?someday=true&start=${params.startDate}&end=${params.endDate}`,
      );
    } else {
      return BaseApi.get<Response_HttpPaginatedSuccess<Schema_Event[]>>(
        `/event?start=${params.startDate}&end=${params.endDate}`,
      );
    }
  },
  reorder: (order: Payload_Order[]) => {
    return BaseApi.put(`/event/reorder`, order);
  },
};

export { EventApi };
