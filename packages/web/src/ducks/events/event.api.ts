import {
  Categories_Recur,
  Params_Events,
  Payload_Order,
  Schema_Event,
} from "@core/types/event.types";
import { CompassApi } from "@web/common/apis/compass.api";

const EventApi = {
  create: (event: Schema_Event) => {
    return CompassApi.post(`/event`, event);
  },
  delete: (_id: string) => {
    return CompassApi.delete(`/event/${_id}`);
  },
  edit: (
    _id: string,
    event: Schema_Event,
    params: { applyTo?: Categories_Recur }
  ) => {
    if (params?.applyTo) {
      return CompassApi.put(`/event/${_id}?applyTo=${params.applyTo}`, event);
    }

    return CompassApi.put(`/event/${_id}`, event);
  },
  get: (params: Params_Events) => {
    if (params.someday) {
      return CompassApi.get(
        `/event?someday=true&start=${params.startDate}&end=${params.endDate}`
      );
    } else {
      return CompassApi.get(
        `/event?start=${params.startDate}&end=${params.endDate}`
      );
    }
  },
  reorder: (order: Payload_Order[]) => {
    return CompassApi.put(`/event/reorder`, order);
  },
};

export { EventApi };
