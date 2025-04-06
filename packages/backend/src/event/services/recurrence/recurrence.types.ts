import {
  Schema_Event_Recur_Base,
  Schema_Event_Recur_Instance,
} from "@core/types/event.types";
import { gSchema$Event } from "@core/types/gcal";

export type Action_Series =
  | "CREATE_SERIES" // New recurring event
  | "UPDATE_SERIES" // Updates entire series
  | "UPDATE_INSTANCE" // Single instance update
  | "SPLIT_SERIES" // Series split
  | "DELETE_SERIES" // Delete entire series
  | "DELETE_INSTANCES"; // Delete one or more instances

export interface Summary_SeriesChange_Gcal {
  action: Action_Series;
  baseEvent?: gSchema$Event;
  modifiedInstance?: gSchema$Event;
  newBaseEvent?: gSchema$Event;
  hasInstances?: boolean;
  splitDate?: string;
}

export interface Summary_SeriesChange_Compass {
  action: Action_Series;
  baseEvent?: Schema_Event_Recur_Base;
  modifiedInstance?: Schema_Event_Recur_Instance;
  newBaseEvent?: Schema_Event_Recur_Base;
  splitDate?: string;
}
