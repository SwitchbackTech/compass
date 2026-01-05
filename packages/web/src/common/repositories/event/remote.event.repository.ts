import {
  Params_Events,
  Payload_Order,
  RecurringEventUpdateScope,
  Schema_Event,
} from "@core/types/event.types";
import { EventApi } from "@web/ducks/events/event.api";
import { Response_GetEventsSuccess } from "@web/ducks/events/event.types";
import { EventRepository } from "./event.repository.interface";

export class RemoteEventRepository implements EventRepository {
  async create(event: Schema_Event | Schema_Event[]): Promise<void> {
    await EventApi.create(event);
  }

  async get(params: Params_Events): Promise<Response_GetEventsSuccess> {
    const response = await EventApi.get(params);
    // Axios responses have a .data property, and the backend returns
    // the data in the shape of Response_HttpPaginatedSuccess<Schema_Event[]>
    // We combine it with params to create Response_GetEventsSuccess
    return {
      ...response.data,
      ...params,
    } as Response_GetEventsSuccess;
  }

  async edit(
    _id: string,
    event: Schema_Event,
    params: { applyTo?: RecurringEventUpdateScope },
  ): Promise<void> {
    await EventApi.edit(_id, event, params);
  }

  async delete(
    _id: string,
    applyTo?: RecurringEventUpdateScope,
  ): Promise<void> {
    await EventApi.delete(_id, applyTo);
  }

  async reorder(order: Payload_Order[]): Promise<void> {
    await EventApi.reorder(order);
  }
}
