import { Action } from "redux";
import { Schema_Event, Categories_Event } from "@core/types/event.types";
import {
  Location_Draft,
  Schema_GridEvent,
} from "@web/common/types/web.event.types";

export interface Action_DraftEvent extends Action {
  payload: Payload_DraftEvent;
}

export interface Action_Draft_Drag extends Action {
  payload: Payload_Draft_Drag;
}
export interface Action_Draft_Resize extends Action {
  payload: Payload_Draft_Resize;
}

export interface Action_Draft_Swap extends Action {
  payload: Payload_Draft_Swap;
}

export interface Action_Location_Set extends Action {
  payload: Payload_Location_Set;
}

interface Payload_Draft_Drag {
  event: Schema_Event;
}

interface Payload_DraftEvent {
  activity?: "createShortcut" | "dragging" | "gridClick" | "resizing";
  event?: Schema_Event;
  eventType: Categories_Event;
}

interface Payload_Draft_Resize {
  event: Schema_Event;
  dateToChange: "startDate" | "endDate";
}

interface Payload_Draft_Swap {
  event: Schema_GridEvent;
  category: Categories_Event;
}

interface Payload_Location_Set {
  location: Location_Draft;
}
