import { ObjectId } from "bson";
import { z } from "zod/v4";
import { ID_OPTIMISTIC_PREFIX } from "@core/constants/core.constants";
import {
  EventSchema,
  RecurrenceSchema,
  Schema_Event,
} from "@core/types/event.types";
import { SelectOption } from "@web/common/types/component.types";

export const IdSchemaWeb = z.pipe(
  z.custom<ObjectId | string>((v) => ObjectId.isValid(v as string)),
  z.transform((v) => v.toString()),
);

export const OptimisticIdSchema = z
  .string()
  .refine(
    (id) =>
      id.startsWith(`${ID_OPTIMISTIC_PREFIX}-`) &&
      ObjectId.isValid(id.replace(`${ID_OPTIMISTIC_PREFIX}-`, "")),
  );

const WebEventSchema = EventSchema.extend({
  _id: z.union([IdSchemaWeb, OptimisticIdSchema]),
  recurrence: RecurrenceSchema.nullable().optional(),
});

export const GridEventSchema = z.object({
  ...WebEventSchema.shape,
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

export const SomedayEventSchema = WebEventSchema.extend({
  isSomeday: z.literal(true),
});

export type Schema_WebEvent = z.infer<typeof WebEventSchema>;

export type Schema_SomedayEvent = z.infer<typeof SomedayEventSchema>;

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
