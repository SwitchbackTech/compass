import {
  type RecurringEventUpdateScope,
  type Schema_Event,
  type WithCompassId,
} from "@core/types/event.types";
import { type SliceStateContext } from "@web/common/store/helpers";
import { type Response_HttpPaginatedSuccess } from "@web/common/types/api.types";
import { type Schema_WebEvent } from "@web/common/types/web.event.types";

export interface Entities_Event {
  [key: string]: Schema_Event;
}

export interface Payload_ConvertEvent {
  event: WithCompassId<Partial<Omit<Schema_WebEvent, "_id">>>;
}

export interface Payload_DeleteEvent {
  _id: string;
  applyTo?: RecurringEventUpdateScope;
}

export interface Payload_EditEvent {
  _id: string;
  event: Schema_WebEvent;
  applyTo?: RecurringEventUpdateScope;
  shouldRemove?: boolean;
}

export interface Payload_GetEvents extends SliceStateContext {
  startDate: string;
  endDate: string;
}

export type Response_GetEventsSuccess<T = Schema_Event[]> =
  Response_HttpPaginatedSuccess<T> & Payload_GetEvents;
