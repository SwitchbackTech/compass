import { type Action } from "redux";
import {
  type Categories_Event,
  type Schema_Event,
} from "@core/types/event.types";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";

export interface Action_DraftEvent extends Action {
  payload: Payload_DraftEvent;
}
export type Activity_DraftEvent =
  | "createShortcut"
  | "dnd"
  | "eventRightClick"
  | "gridClick"
  | "keyboardEdit"
  | "resizing"
  | "sidebarClick";

export interface Action_Draft_Resize extends Action {
  payload: Payload_Draft_Resize;
}

export interface Action_Draft_Swap extends Action {
  payload: Payload_Draft_Swap;
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
  event: Schema_Event | null;
}
export interface Status_DraftEvent {
  activity: Activity_DraftEvent | null;
  eventType?: Categories_Event | null;
  isDrafting: boolean;
  /**
   * Whether the floating event form is shown for the current draft. Kept
   * separate from `isDrafting`/`activity` because a draft can exist without the
   * form being open (e.g. while drag-creating a timed event, the draft renders
   * but the form stays closed until the gesture finishes).
   */
  isFormOpen: boolean;
  dateToResize?: "startDate" | "endDate" | null;
}
