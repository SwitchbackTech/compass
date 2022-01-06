import { Priorities } from "@core/core.constants";
import { Query } from "express-serve-static-core";

export interface Event_NoId {
  // note: no compass _id field here
  gEventId?: string;
  // this user field can cause issues if someone adds it and it doesnt match the one
  // created during JWT middleware
  // user: string;
  priorities: string[];
  summary: string;
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

export interface Event extends Event_NoId {
  _id: string; // needs to always return events id
}

//rename to Schema_Event
export interface Schema_Event_Wip {
  title?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  priority: Priorities;
  id?: string;
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
  priorities?: Priorities[];
}

export interface Result_DeleteMany {
  deletedCount: number;
  errors: any[];
}

export interface Query_Event extends Query {
  start?: string;
  end?: string;
  priorities?: string; // example: 'p1,p2,p3'
}
