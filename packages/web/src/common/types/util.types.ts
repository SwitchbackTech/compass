import { Dayjs } from "dayjs";

export interface AssignResult {
  fits: boolean;
  rowNum?: number;
}

export interface Option_Time {
  label: string;
  value: string;
}
export interface Params_DateChange {
  start: Date;
  end: Date;
}
export interface Params_TimeChange {
  oldStart: string;
  oldEnd: string;
  start: string;
  end: string;
}

export interface Range_Week {
  weekStart: Dayjs;
  weekEnd: Dayjs;
}

export interface WidthPercentages {
  current: number[];
  pastFuture: number[];
}

export interface WidthPixels {
  current: {
    sidebarOpen: number[];
    sidebarClosed: number[];
  };
  pastFuture: {
    sidebarOpen: number;
    sidebarClosed: number;
  };
}

export type Ref_Callback = (node: HTMLDivElement) => void;
