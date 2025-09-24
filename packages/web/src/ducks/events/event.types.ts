import { Action } from "redux";
import { Priorities } from "@core/constants/core.constants";
import {
  RecurringEventUpdateScope,
  Schema_Event,
} from "@core/types/event.types";
import { SliceStateContext } from "@web/common/store/helpers";
import {
  Filters_Pagination,
  Response_HttpPaginatedSuccess,
} from "@web/common/types/api.types";
import { Payload_NormalizedAsyncAction } from "@web/common/types/entity.types";
import { Schema_SomedayEvent } from "@web/common/types/web.event.types";

export interface Action_ConvertSomedayEvent extends Action {
  payload: Payload_ConvertSomedayEvent;
}

export interface Action_ConvertTimedEvent extends Action {
  payload: Payload_ConvertTimedEvent;
}

export interface Action_CreateEvent extends Action {
  payload: Schema_Event;
}

export interface Action_DeleteEvent extends Action {
  payload: Payload_DeleteEvent;
}

export interface Action_EditEvent extends Action {
  payload: Payload_EditEvent;
}
export interface Action_GetEvents extends Action {
  payload: Payload_GetEvents;
}
export interface Action_GetPaginatedEvents extends Action {
  payload: Payload_GetPaginatedEvents;
}

export interface Action_GetSomedayEvents extends Action {
  payload: Action_GetSomedayEvents;
}

export interface Action_InsertEventId extends Action {
  payload: { _id: string };
}

export interface Action_InsertEvents extends Action {
  payload: Entities_Event | undefined;
}

export interface Action_ReplaceEvent extends Action {
  payload: Payload_ReplaceEvent;
}

export interface Action_TimezoneChange extends Action {
  payload: { timezone: string };
}

export enum Category {
  ThisWeekOnly = "thisWeekOnly",
  ThisToFutureWeek = "thisToFutureWeek",
  PastToThisWeek = "pastToThisWeek",
  PastToFutureWeek = "pastToFutureWeek",
}

export interface Entities_Event {
  [key: string]: Schema_Event;
}

interface Payload_ConvertSomedayEvent {
  _id: string;
  updatedFields: Schema_Event;
}

interface Payload_ConvertTimedEvent {
  event: Schema_SomedayEvent;
}

interface Payload_DeleteEvent {
  _id: string;
  applyTo?: RecurringEventUpdateScope;
}

export interface Payload_EditEvent {
  _id: string;
  event: Schema_Event;
  applyTo?: RecurringEventUpdateScope;
  shouldRemove?: boolean;
}

export interface Payload_ReplaceEvent {
  oldEventId: string;
  newEventId: string;
}

export interface Payload_GetPaginatedEvents extends Filters_Pagination {
  priorities: Priorities[];
}

export interface Payload_GetEvents extends SliceStateContext {
  startDate: string;
  endDate: string;
}

export type Response_CreateEventSaga =
  // $$ either break out into separate `Response_CreateEventSuccess` type,
  // like is done for `GetEventsSuccess` or ignore and delete this comment
  Response_HttpPaginatedSuccess<Schema_Event> & Schema_Event;

export type Response_GetEventsSaga =
  Response_GetEventsSuccess<Payload_NormalizedAsyncAction> &
    Payload_GetPaginatedEvents;

export type Response_GetEventsSuccess<T = Schema_Event[]> =
  Response_HttpPaginatedSuccess<T> & Payload_GetEvents;
