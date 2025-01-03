import { Categories_Event, Schema_Event } from "@core/types/event.types";
import { SelectOption } from "@web/common/types/component.types";

export enum Recurrence_Selection {
  NONE = "none",
  WEEK = "week",
  MONTH = "month",
}
export interface Schema_GridEvent extends Schema_Event {
  hasFlipped?: boolean;
  importanceIndex?: number;
  isEditing?: boolean;
  isOpen?: boolean;
  row?: number;
  siblingsCount?: number;
}

export interface Schema_OptimisticEvent extends Schema_Event {
  _id: string; // We guarantee that we have an _id for optimistic events, unlike `Schema_Event`
}

export interface Schema_SelectedDates {
  startDate: Date;
  startTime: SelectOption<string>;
  endDate: Date;
  endTime: SelectOption<string>;
  isAllDay: boolean;
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
export interface Status_DraftEvent {
  activity: string | null;
  eventType: Categories_Event | null;
  isDrafting: boolean;
  dateToResize: "startDate" | "endDate" | null;
}
