import { Priorities } from "@core/constants/core.constants";
import { Schema_Event } from "@core/types/event.types";

export interface FutureEventsProps {
  shouldSetTopMargin?: boolean;
}
export interface PriorityFilter {
  [Priorities.RELATIONS]?: boolean;
  [Priorities.WORK]?: boolean;
  [Priorities.SELF]?: boolean;
}

export interface SectionProps {
  height?: string;
}

export interface Schema_SomedayEventsColumn {
  columns: {
    [key: string]: {
      id: string;
      eventIds: string[];
    };
  };
  columnOrder: string[];
  events: {
    [key: string]: Schema_Event;
  };
}
