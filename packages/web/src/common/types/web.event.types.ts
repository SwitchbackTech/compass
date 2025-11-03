import { z } from "zod/v4";
import { EventSchema, Schema_Event } from "@core/types/event.types";
import { SelectOption } from "@web/common/types/component.types";

export const GridEventSchema = z.object({
  ...EventSchema.shape,
  hasFlipped: z.boolean().optional(),
  isOpen: z.boolean().optional(),
  row: z.number().optional(),
  position: z.object({
    isOverlapping: z.boolean(),
    widthMultiplier: z.number(), // EG: 0.5 for half width
    horizontalOrder: z.number(),
    dragOffset: z.object({ x: z.number(), y: z.number() }),
    initialX: z.number().nullable(),
    initialY: z.number().nullable(),
  }),
});

export type Schema_GridEvent = z.infer<typeof GridEventSchema>;

export type Direction_Migrate = "forward" | "back" | "up" | "down";

export interface Schema_SelectedDates {
  startDate: Date;
  startTime: SelectOption<string>;
  endDate: Date;
  endTime: SelectOption<string>;
  isAllDay: boolean;
}

/**
 * Event category, based on its display type
 * - ALLDAY: An all-day event
 * - TIMED: A timed event
 * - SOMEDAY_WEEK: A someday event that is displayed in the sidebarWeek view
 * - SOMEDAY_MONTH: A someday event that is displayed in the sidebarMonth view
 */
export enum Categories_Event {
  ALLDAY = "allday",
  TIMED = "timed",
  SOMEDAY_WEEK = "sidebarWeek",
  SOMEDAY_MONTH = "sidebarMonth",
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
