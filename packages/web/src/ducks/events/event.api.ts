import {
  type Params_Events,
  type Payload_Order,
  type RecurringEventUpdateScope,
  type Schema_Event,
} from "@core/types/event.types";
import { type ApiResponse, BaseApi } from "@web/common/apis/base/base.api";
import { type Response_HttpPaginatedSuccess } from "@web/common/types/api.types";

const EventApi = {
  create: (event: Schema_Event | Schema_Event[]) => {
    return BaseApi.post<void>(`/event`, event);
  },
  delete: (_id: string, applyTo?: RecurringEventUpdateScope) => {
    return BaseApi.delete<void>(`/event/${_id}?applyTo=${applyTo}`);
  },
  edit: (
    _id: string,
    event: Schema_Event,
    params: { applyTo?: RecurringEventUpdateScope },
  ): Promise<ApiResponse<void>> => {
    if (params?.applyTo) {
      return BaseApi.put<void>(
        `/event/${_id}?applyTo=${params.applyTo}`,
        event,
      );
    }

    return BaseApi.put<void>(`/event/${_id}`, event);
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
