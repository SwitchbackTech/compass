import { ObjectId } from "bson";
import { z } from "zod";
import { ID_OPTIMISTIC_PREFIX } from "@core/constants/core.constants";
import {
  CompassCoreEventSchema,
  CompassEventRecurrence,
  Schema_Event,
  idSchema,
} from "@core/types/event.types";
import { SelectOption } from "@web/common/types/component.types";

export enum Recurrence_Selection {
  NONE = "none",
  WEEK = "week",
  MONTH = "month",
}

export const optimisticIdSchema = z
  .string()
  .refine(
    (id) =>
      id.startsWith(`${ID_OPTIMISTIC_PREFIX}-`) &&
      ObjectId.isValid(id.replace(`${ID_OPTIMISTIC_PREFIX}-`, "")),
  );

const WebEventRecurrence = z.union([
  z.undefined(),
  CompassEventRecurrence.omit({ rule: true }).extend({ rule: z.null() }),
  CompassEventRecurrence,
]);

const WebCoreEventSchema = CompassCoreEventSchema.omit({
  recurrence: true,
}).extend({
  recurrence: WebEventRecurrence,
});

export const GridEventSchema = WebCoreEventSchema.extend({
  hasFlipped: z.boolean().optional(),
  isOpen: z.boolean().optional(),
  row: z.number().optional(),
  order: z.number().optional(), // allow carry over from Someday events
});

export const SomedayEventSchema = WebCoreEventSchema.extend({
  _id: z.union([idSchema, optimisticIdSchema]),
  isSomeday: z.literal(true),
  order: z.number(),
});

export type Schema_WebEvent = z.infer<typeof WebCoreEventSchema>;
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

export interface Schema_OptimisticEvent extends Schema_GridEvent {
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
