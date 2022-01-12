import { Query } from "express-serve-static-core";

import { Priorities } from "@core/core.constants";

export interface Params_DeleteMany {
  key: string;
  ids: string[];
}
export interface Params_Events {
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
  offset?: number;
  priorities?: Priorities[]; // use ids instead of words
}

export interface Result_DeleteMany {
  deletedCount: number;
  errors: any[];
}

export interface Schema_Event {
  _id?: string;
  gEventId?: string;
  title?: string;
  description?: string | null | undefined;
  startDate?: string;
  endDate?: string;
  // priority: Priorities; $$
  priority?: string;
  priorities?: string[]; // the eventual structure, with ids as strs
  user?: string;

  //$$
  isTimeSelected?: boolean;
  showStartTimeLabel?: boolean;
  allDay?: boolean;
  allDayOrder?: number;
  groupOrder?: number;
  groupCount?: number;
  order?: number;
}

//todo merge with Params_Events_Wip
export interface Query_Event extends Query {
  start?: string;
  end?: string;
  priorities?: string; // example: 'p1,p2,p3'
}
