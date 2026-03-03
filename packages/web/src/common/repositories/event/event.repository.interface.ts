import {
  type Params_Events,
  type Payload_Order,
  type RecurringEventUpdateScope,
  type Schema_Event,
} from "@core/types/event.types";
import { type Response_GetEventsSuccess } from "@web/ducks/events/event.types";

export interface EventRepository {
  create(event: Schema_Event | Schema_Event[]): Promise<void>;
  get(params: Params_Events): Promise<Response_GetEventsSuccess>;
  edit(
    _id: string,
    event: Schema_Event,
    params: { applyTo?: RecurringEventUpdateScope },
  ): Promise<void>;
  delete(_id: string, applyTo?: RecurringEventUpdateScope): Promise<void>;
  reorder(order: Payload_Order[]): Promise<void>;
}
