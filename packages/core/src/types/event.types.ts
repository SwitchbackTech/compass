import { Query } from "express-serve-static-core";

import { Priorities } from "@core/core.constants";

export interface Old_Schema_Event_NoId {
  // note: no compass _id field here
  gEventId?: string;
  // TODO make user optional (?)
  // this user field can cause issues if someone adds it and it doesnt match the one
  // created during JWT middleware
  // user: string;
  priorities: string[];
  title: string;
  description?: string | null;
  start?: {
    dateTime?: string | null;
    date?: string | null;
    timeZone?: string | null;
  };
  end?: {
    dateTime?: string | null;
    date?: string | null;
    timeZone?: string | null;
  };
}

export interface Old_Schema_Event extends Old_Schema_Event_NoId {
  _id: string; // needs to always return events id
}

export interface Schema_Event_Wip {
  _id?: string; // $$ make required?
  title?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  priority: Priorities;
  priorities?: string[]; // the eventual structure, with ids as strs
  isTimeSelected?: boolean;
  showStartTimeLabel?: boolean;
  allDay?: boolean;
  allDayOrder?: number;
  groupOrder?: number;
  groupCount?: number;
  order?: number;
}

export interface Params_DeleteMany {
  key: string;
  ids: string[];
}
export interface Params_Events_Wip {
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

//todo merge with Params_Events_Wip
export interface Query_Event extends Query {
  start?: string;
  end?: string;
  priorities?: string; // example: 'p1,p2,p3'
}
