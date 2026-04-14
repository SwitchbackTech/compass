import { type Schema_Event } from "@core/types/event.types";
import {
  type gSchema$Event,
  type gSchema$EventBase,
  type gSchema$EventInstance,
} from "@core/types/gcal";
import { type ObjectId } from "mongodb";

export interface EventsToModify {
  toUpdate: Schema_Event[];
  toDelete: string[];
}

export type Callback_EventProcessor = (
  event: gSchema$Event | gSchema$EventBase | gSchema$EventInstance,
  sharedState: Map_Recurrences,
) => boolean; // Returns true if event should be saved

export interface Map_Recurrences {
  baseEventStartTimes: Map<string, string | null>;
  processedEventIdsPass1: Set<string>;
  baseEventMap: Map<string, ObjectId>;
}
