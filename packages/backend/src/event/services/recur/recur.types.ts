import { Schema_Event } from "@core/types/event.types";
import { gSchema$Event } from "@core/types/gcal";

export type Action_Series =
  | "CREATE_SERIES" // New recurring event
  | "UPDATE_SERIES" // Series modification (could be split or update)
  | "UPDATE_INSTANCE" // Single instance update
  | "DELETE_SERIES" // Delete entire series
  | "DELETE_INSTANCES"; // Delete one or more instances

export interface Summary_SeriesChange_Gcal {
  action: Action_Series;
  baseEvent?: gSchema$Event;
  modifiedInstance?: gSchema$Event;
  newBaseEvent?: gSchema$Event;
  endDate?: string;
  hasInstances?: boolean;
}

export interface Summary_SeriesChange_Compass {
  action: Action_Series;
  baseEvent?: Schema_Event;
  modifiedInstance?: Schema_Event;
  newBaseEvent?: Schema_Event;
  endDate?: string;
}
