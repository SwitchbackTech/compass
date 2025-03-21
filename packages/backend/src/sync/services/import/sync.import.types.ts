import { Schema_Event_Core } from "@core/types/event.types";

export interface EventsToModify {
  toUpdate: Schema_Event_Core[];
  toDelete: string[];
}
