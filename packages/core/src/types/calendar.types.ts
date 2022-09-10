import { gSchema$CalendarListEntry } from "@core/types/gcal";

export interface Schema_CalendarList {
  user: string;
  google: {
    items: gSchema$CalendarListEntry[];
  };
}
