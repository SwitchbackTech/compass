import { Schema_Event_Core } from "@core/types/event.types";
import { gSchema$Event } from "@core/types/gcal";

export interface EventsToModify {
  toUpdate: Schema_Event_Core[];
  toDelete: string[];
}

export type EventProcessorCallback = (
  event: gSchema$Event,
  sharedState: ImportAllSharedState,
) => boolean; // Returns true if event should be saved

export type ImportAllSharedState = {
  baseEventStartTimes: Map<string, string | null>;
  processedEventIdsPass1: Set<string>;
};
