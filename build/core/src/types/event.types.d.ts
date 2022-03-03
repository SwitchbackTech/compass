import { Query } from "express-serve-static-core";
import { Origin, Priorities } from "@core/core.constants";
export interface Params_DeleteMany {
  key: string;
  ids: string[];
}
export interface Params_Events {
  startDate: string;
  endDate: string;
  page?: number;
  pageSize?: number;
  offset?: number;
  priorities?: Priorities[];
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
  gEventId?: string;
  origin?: Origin;
  priority?: string;
  priorities?: string[];
  startDate?: string;
  title?: string;
  user?: string;
  isTimeSelected?: boolean;
  showStartTimeLabel?: boolean;
  groupOrder?: number;
  groupCount?: number;
  order?: number;
}
export interface Query_Event extends Query {
  start?: string;
  end?: string;
  priorities?: string;
}
//# sourceMappingURL=event.types.d.ts.map
