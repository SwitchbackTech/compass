import { z } from "zod";
import {
  CompassEventRecurrence,
  CoreEventSchema,
  Schema_Event,
} from "@core/types/event.types";
import { SelectOption } from "@web/common/types/component.types";

export enum Recurrence_Selection {
  NONE = "none",
  WEEK = "week",
  MONTH = "month",
}

const WebEventRecurrence = z.union([
  z.undefined(),
  CompassEventRecurrence.omit({ rule: true }).extend({ rule: z.null() }),
  CompassEventRecurrence,
]);

const WebCoreEventSchema = CoreEventSchema.omit({ recurrence: true }).extend({
  recurrence: WebEventRecurrence,
});

export const GridEventSchema = WebCoreEventSchema.extend({
  hasFlipped: z.boolean().optional(),
  isOpen: z.boolean().optional(),
  row: z.number().optional(),
});

export const SomedayEventSchema = WebCoreEventSchema.extend({
  order: z.number(),
  isSomeday: z.literal(true),
});

export type Schema_SomedayEvent = z.infer<typeof SomedayEventSchema>;

export interface Schema_GridEvent extends Schema_Event {
  hasFlipped?: boolean;
  isOpen?: boolean;
  row?: number;
  position: {
    isOverlapping: boolean;
    widthMultiplier: number; // EG: 0.5 for half width
    horizontalOrder: number;
    dragOffset: { y: number };
    initialX: number | null;
    initialY: number | null;
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
