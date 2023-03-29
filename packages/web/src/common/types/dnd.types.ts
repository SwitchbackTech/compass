import { Schema_Event } from "@core/types/event.types";

export enum Category_DragItem {
  EVENT_SOMEDAY = "event_someday",
  EVENT_DATE = "event_date",
  EVENT_DATETIME = "event_datetime",
}

export interface DragItem_Someday {
  _id: Schema_Event["_id"];
  description: Schema_Event["description"];
  order: Schema_Event["order"];
  priority: Schema_Event["priority"];
  title: Schema_Event["title"];
}

export interface DropResult_ReactDND {
  _id: Schema_Event["_id"];
  description: Schema_Event["description"];
  priority: Schema_Event["priority"];
  title: Schema_Event["title"];
}
