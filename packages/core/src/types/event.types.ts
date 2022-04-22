import { Query } from "express-serve-static-core";
import { Origin, Priority, Priorities } from "@core/core.constants";

export interface Params_DeleteMany {
  key: string;
  ids: string[];
}
export interface Params_Events {
  startDate: string;
  endDate: string;
  someday: boolean;
  /* these not implemented yet */
  page?: number;
  pageSize?: number;
  offset?: number;
  priorities?: Priorities[]; // TODO use ids instead of words
}

export interface Result_DeleteMany {
  deletedCount: number;
  errors: any[];
}

export interface Schema_Event {
  _id?: string;
  allDayOrder?: number;
  endDate?: string;
  description?: string | null | undefined;
  isAllDay?: boolean;
  isSomeday?: boolean;
  isTimesShown?: boolean;
  gEventId?: string;
  origin?: Origin;
  priority?: Priority;
  priorities?: string[]; // the eventual structure, with ids as strs
  startDate?: string;
  title?: string;
  user?: string;
}

export interface Query_Event extends Query {
  end?: string;
  someday?: string;
  start?: string;
  priorities?: string; // example: 'p1,p2,p3'
}
