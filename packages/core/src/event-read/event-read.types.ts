import { type Priority } from "@core/constants/core.constants";
import { type Schema_Event } from "@core/types/event.types";

export type EventReadMode = "calendar" | "someday";

export type EventReadWindow = {
  mode: EventReadMode;
  startDate: string;
  endDate: string;
  priorities?: Priority[];
};

export type EventReadShapeInput = {
  window: EventReadWindow;
  events: Schema_Event[];
  baseEventsById?: Record<string, Schema_Event | undefined>;
  repairSomedayOrder?: boolean;
};

export type EventReadShapeResult = {
  data: Schema_Event[];
  count: number;
  startDate: string;
  endDate: string;
};
