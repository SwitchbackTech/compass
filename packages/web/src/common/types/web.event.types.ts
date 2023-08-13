import { Categories_Event, Schema_Event } from "@core/types/event.types";
import { SelectOption } from "@web/common/types/component.types";

export enum Recurrence_Selection {
  NONE = "none",
  WEEK = "week",
  WEEKS_2 = "2 weeks",
  WEEKS_3 = "3 weeks",
  MONTH = "month",
}
export interface Schema_GridEvent extends Schema_Event {
  isOpen?: boolean;
  isEditing?: boolean;
  importanceIndex?: number;
  row?: number;
  siblingsCount?: number;
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
