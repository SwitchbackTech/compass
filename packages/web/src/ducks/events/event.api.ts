import { AxiosPromise } from "axios";
import {
  Params_Events,
  Payload_Order,
  RecurringEventUpdateScope,
  Schema_Event,
} from "@core/types/event.types";
import { CompassApi } from "@web/common/apis/compass.api";
import { Response_HttpPaginatedSuccess } from "@web/common/types/api.types";

const EventApi = {
  create: (event: Schema_Event | Schema_Event[]) => {
    return CompassApi.post<void>(`/event`, event);
  },
  delete: (_id: string, applyTo?: RecurringEventUpdateScope) => {
    return CompassApi.delete<void>(`/event/${_id}?applyTo=${applyTo}`);
  },
  edit: (
    _id: string,
    event: Schema_Event,
    params: { applyTo?: RecurringEventUpdateScope },
  ): AxiosPromise<void> => {
    if (params?.applyTo) {
      return CompassApi.put<void>(
        `/event/${_id}?applyTo=${params.applyTo}`,
        event,
      );
    }

    return CompassApi.put<void>(`/event/${_id}`, event);
  },
  get: (params: Params_Events) => {
    if (params.someday) {
      return CompassApi.get<Response_HttpPaginatedSuccess<Schema_Event[]>>(
        `/event?someday=true&start=${params.startDate}&end=${params.endDate}`,
      );
    } else {
      return CompassApi.get<Response_HttpPaginatedSuccess<Schema_Event[]>>(
        `/event?start=${params.startDate}&end=${params.endDate}`,
      );
    }
  },
  reorder: (order: Payload_Order[]) => {
    return CompassApi.put(`/event/reorder`, order);
  },
};

export { EventApi };
