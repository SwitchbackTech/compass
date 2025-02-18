import { z } from "zod";
import {
  Categories_Event,
  CoreEventSchema,
  Schema_Event,
} from "@core/types/event.types";
import { SelectOption } from "@web/common/types/component.types";
import { Activity_DraftEvent } from "@web/ducks/events/slices/draft.slice.types";

export enum Recurrence_Selection {
  NONE = "none",
  WEEK = "week",
  MONTH = "month",
}

export const GridEventSchema = CoreEventSchema.extend({
  hasFlipped: z.boolean().optional(),
  isOpen: z.boolean().optional(),
  row: z.number().optional(),
});

export interface Schema_GridEvent extends Schema_Event {
  hasFlipped?: boolean;
  isOpen?: boolean;
  row?: number; //TODO: delete if not used
  position: {
    isOverlapping: boolean;
    widthMultiplier: number; // EG: 0.5 for half width
    horizontalOrder: number;
  };
}

export interface Schema_OptimisticEvent extends Schema_Event {
  _id: string; // We guarantee that we have an _id for optimistic events, unlike `Schema_Event`
}

export interface Schema_SelectedDates {
  startDate: Date;
  startTime: SelectOption<string>;
  endDate: Date;
  endTime: SelectOption<string>;
  isAllDay: boolean;
}
export interface Schema_SomedayEventsColumn {
  columns: {
    [key: string]: {
      id: string;
      eventIds: string[];
    };
  };
  columnOrder: string[];
  events: {
    [key: string]: Schema_Event;
  };
}
