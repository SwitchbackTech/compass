import { gSchema$CalendarListEntry } from "./gcal";

export interface Schema_CalendarList {
  user: string;
  google: {
    items: gSchema$CalendarListEntry[];
  };
}
