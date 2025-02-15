import { Recurrence_Selection } from "../types/web.event.types";

export const COLUMN_WEEK = "weekEvents";
export const COLUMN_MONTH = "monthEvents";

export const GOOGLE = "google";

export const ID_ALLDAY_COLUMNS = "allDayColumns";
export const ID_EVENT_FORM = "Event Form";
export const ID_GRID_ALLDAY_ROW = "allDayRow";
export const ID_GRID_EVENTS_ALLDAY = "allDayEvents";
export const ID_GRID_EVENTS_TIMED = "timedEvents";
export const ID_GRID_MAIN = "mainGrid";
export const ID_MAIN = "mainSection";
export const ID_DATEPICKER_SIDEBAR = "sidebarDatePicker";
export const ID_SOMEDAY_DRAFT = "somedayDraft";
export const ID_SOMEDAY_EVENTS = "ID_SOMEDAY_EVENTS";
export const ID_SOMEDAY_EVENT_FORM = "Someday Event Form";
export const ID_OPTIMISTIC_PREFIX = "optimistic";
export const DATA_EVENT_ELEMENT_ID = "data-event-id";

export const OPTIONS_RECURRENCE = {
  WEEK: { value: Recurrence_Selection.WEEK, label: "week" },
  WEEKS_2: { value: Recurrence_Selection.WEEKS_2, label: "2 weeks" },
  WEEKS_3: { value: Recurrence_Selection.WEEKS_3, label: "3 weeks" },
  MONTH: { value: Recurrence_Selection.MONTH, label: "month" },
};

export enum ZIndex {
  LAYER_1 = 1,
  LAYER_2 = 2,
  LAYER_3 = 3,
  LAYER_4 = 4,
  LAYER_5 = 5,
  MAX = 20,
}

export const ACCEPTED_TIMES = [
  "12:00 AM",
  "12:15 AM",
  "12:30 AM",
  "12:45 AM",
  "1:00 AM",
  "1:15 AM",
  "1:30 AM",
  "1:45 AM",
  "2:00 AM",
  "2:15 AM",
  "2:30 AM",
  "2:45 AM",
  "3:00 AM",
  "3:15 AM",
  "3:30 AM",
  "3:45 AM",
  "4:00 AM",
  "4:15 AM",
  "4:30 AM",
  "4:45 AM",
  "5:00 AM",
  "5:15 AM",
  "5:30 AM",
  "5:45 AM",
  "6:00 AM",
  "6:15 AM",
  "6:30 AM",
  "6:45 AM",
  "7:00 AM",
  "7:15 AM",
  "7:30 AM",
  "7:45 AM",
  "8:00 AM",
  "8:15 AM",
  "8:30 AM",
  "8:45 AM",
  "9:00 AM",
  "9:15 AM",
  "9:30 AM",
  "9:45 AM",
  "10:00 AM",
  "10:15 AM",
  "10:30 AM",
  "10:45 AM",
  "11:00 AM",
  "11:15 AM",
  "11:30 AM",
  "11:45 AM",
  "12:00 PM",
  "12:15 PM",
  "12:30 PM",
  "12:45 PM",
  "1:00 PM",
  "1:15 PM",
  "1:30 PM",
  "1:45 PM",
  "2:00 PM",
  "2:15 PM",
  "2:30 PM",
  "2:45 PM",
  "3:00 PM",
  "3:15 PM",
  "3:30 PM",
  "3:45 PM",
  "4:00 PM",
  "4:15 PM",
  "4:30 PM",
  "4:45 PM",
  "5:00 PM",
  "5:15 PM",
  "5:30 PM",
  "5:45 PM",
  "6:00 PM",
  "6:15 PM",
  "6:30 PM",
  "6:45 PM",
  "7:00 PM",
  "7:15 PM",
  "7:30 PM",
  "7:45 PM",
  "8:00 PM",
  "8:15 PM",
  "8:30 PM",
  "8:45 PM",
  "9:00 PM",
  "9:15 PM",
  "9:30 PM",
  "9:45 PM",
  "10:00 PM",
  "10:15 PM",
  "10:30 PM",
  "10:45 PM",
  "11:00 PM",
  "11:15 PM",
  "11:30 PM",
  "11:45 PM",
];
