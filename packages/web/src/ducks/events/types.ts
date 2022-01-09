import { Action } from "redux";

import { Priorities } from "@core/core.constants";
import { Schema_Event_Wip } from "@core/types/event.types";

import { NormalizedAsyncActionPayload } from "@web/common/types/entities";
import {
  HttpPaginatedSuccessResponse,
  PaginationFilters,
} from "@web/common/types/apiTypes";

export interface GetWeekEventsPayload {
  startDate: string;
  endDate: string;
}

export interface GetWeekEventsAction extends Action {
  payload: GetWeekEventsPayload;
}

export interface GetPaginatedEventsPayload extends PaginationFilters {
  priorities: Priorities[];
}

export interface GetPaginatedEventsAction extends Action {
  payload: GetPaginatedEventsPayload;
}

export interface CreateEventAction extends Action {
  payload: Schema_Event_Wip;
}

export interface EditEventPayload {
  id: string;
  event: Schema_Event_Wip;
}

export interface EditEventAction extends Action {
  payload: EditEventPayload;
}

export type GetEventsSuccessResponse<T = Schema_Event_Wip[]> =
  HttpPaginatedSuccessResponse<T> & GetWeekEventsPayload;

export type GetEventsSagaResponse =
  GetEventsSuccessResponse<NormalizedAsyncActionPayload> &
    GetPaginatedEventsPayload;

export type SideBarSectionType = "future" | "currentMonth";

export type SectionType = SideBarSectionType | "week";
