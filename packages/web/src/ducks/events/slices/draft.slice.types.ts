import { Action } from "redux";
import { Categories_Event, Schema_Event } from "@core/types/event.types";
import {
  Schema_GridEvent,
  Schema_WebEvent,
} from "@web/common/types/web.event.types";

export interface Action_DraftEvent extends Action {
  payload: Payload_DraftEvent;
}
export type Activity_DraftEvent =
  | "createShortcut"
  | "dnd"
  | "dragging"
  | "eventRightClick"
  | "gridClick"
  | "resizing"
  | "sidebarClick";

export interface Action_Draft_Drag extends Action {
  payload: Payload_Draft_Drag;
}
export interface Action_Draft_Resize extends Action {
  payload: Payload_Draft_Resize;
}

export interface Action_Draft_Swap extends Action {
  payload: Payload_Draft_Swap;
}

interface Payload_Draft_Drag {
  event: Schema_Event;
}

interface Payload_DraftEvent {
  activity: Activity_DraftEvent;
  event: Schema_Event | null;
  eventType: Categories_Event;
}

interface Payload_Draft_Resize {
  category: Categories_Event;
  event: Schema_Event;
  dateToChange: "startDate" | "endDate";
}

interface Payload_Draft_Swap {
  event: Schema_GridEvent;
  category: Categories_Event;
}
export interface State_DraftEvent {
  status: Status_DraftEvent | null;
  event: Schema_WebEvent | null;
}
export interface Status_DraftEvent {
  activity: Activity_DraftEvent | null;
  eventType?: Categories_Event | null;
  isDrafting: boolean;
  dateToResize?: "startDate" | "endDate" | null;
}
