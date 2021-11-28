import { Action } from 'redux';

import {
  EventEntity,
  NormalizedAsyncActionPayload,
  Priorities,
} from '@common/types/entities';
import {
  HttpPaginatedSuccessResponse,
  PaginationFilters,
} from '@common/types/apiTypes';

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
  payload: EventEntity;
}

export interface EditEventPayload {
  id: string;
  event: EventEntity;
}

export interface EditEventAction extends Action {
  payload: EditEventPayload;
}

export type GetEventsSuccessResponse<T = EventEntity[]> =
  HttpPaginatedSuccessResponse<T> & GetWeekEventsPayload;

export type GetEventsSagaResponse =
  GetEventsSuccessResponse<NormalizedAsyncActionPayload> &
    GetPaginatedEventsPayload;

export type SideBarSectionType = 'future' | 'currentMonth';

export type SectionType = SideBarSectionType | 'week';
