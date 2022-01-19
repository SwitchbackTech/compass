import { Action } from "redux";

import { Priorities } from "@core/core.constants";
import { Schema_Event } from "@core/types/event.types";

import { Payload_NormalizedAsyncAction } from "@web/common/types/entities";
import {
  Response_HttpPaginatedSuccess,
  Filters_Pagination,
} from "@web/common/types/apiTypes";

export interface Action_CreateEvent extends Action {
  payload: Schema_Event;
}

export interface Action_DeleteEvent extends Action {
  payload: Payload_DeleteEvent;
}

export interface Action_EditEvent extends Action {
  payload: Payload_EditEvent;
}
export interface Action_GetWeekEvents extends Action {
  payload: Payload_GetWeekEvents;
}
export interface Action_GetPaginatedEvents extends Action {
  payload: Payload_GetPaginatedEvents;
}

export interface Action_InsertEventId extends Action {
  payload: { _id: string };
}

export interface Action_InsertEvents extends Action {
  payload: Entities_Event | undefined;
}

export interface Entities_Event {
  [key: string]: Schema_Event;
}
export interface Payload_DeleteEvent {
  _id: string;
}

export interface Payload_EditEvent {
  _id: string;
  event: Schema_Event;
}
export interface Payload_GetWeekEvents {
  startDate: string;
  endDate: string;
}

export interface Payload_GetPaginatedEvents extends Filters_Pagination {
  priorities: Priorities[];
}

export type Response_CreateEventSaga =
  // Response_CreateEventSuccess<Payload_NormalizedAsyncAction> & Schema_Event[];
  Response_GetEventsSuccess<Payload_NormalizedAsyncAction> & Schema_Event[];

export type Response_GetEventsSaga =
  Response_GetEventsSuccess<Payload_NormalizedAsyncAction> &
    Payload_GetPaginatedEvents;

export type Response_GetEventsSuccess<T = Schema_Event[]> =
  Response_HttpPaginatedSuccess<T> & Payload_GetWeekEvents;

export type SectionType_Sidebar = "future" | "currentMonth";

export type SectionType = SectionType_Sidebar | "week";
