import { ObjectId } from "bson";
import { z } from "zod";
import { ID_OPTIMISTIC_PREFIX } from "@core/constants/core.constants";
import {
  CompassCoreEventSchema,
  CompassEventRecurrence,
  Schema_Event,
} from "@core/types/event.types";
import { IDSchema } from "@core/types/type.utils";
import { SelectOption } from "@web/common/types/component.types";

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

const WebCoreEventSchema = CompassCoreEventSchema.extend({
  _id: z.union([IDSchema, optimisticIdSchema]).optional(),
  recurrence: WebEventRecurrence,
  order: z.number().optional(),
});

export const GridEventSchema = WebCoreEventSchema.extend({
  hasFlipped: z.boolean().optional(),
  isOpen: z.boolean().optional(),
  row: z.number().optional(),
  order: z.number().optional(), // allow carry over from Someday events
  position: z.object({
    isOverlapping: z.boolean(),
    totalEventsInGroup: z.number().default(1),
    widthMultiplier: z.number(), // EG: 0.5 for half width
    horizontalOrder: z.number(),
    dragOffset: z.object({ x: z.number(), y: z.number() }),
    initialX: z.number().nullable(),
    initialY: z.number().nullable(),
  }),
});

export const SomedayEventSchema = WebCoreEventSchema.extend({
  isSomeday: z.literal(true),
  order: z.number(),
});

export type Schema_WebEvent = z.infer<typeof WebCoreEventSchema>;

export type Schema_SomedayEvent = z.infer<typeof SomedayEventSchema>;

export type Schema_GridEvent = z.infer<typeof GridEventSchema>;

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

/**
 * Adds an _id property to an object shape
 * @template TSchema - The base type to add _id to.
 */
export type WithId<TSchema> = TSchema & { _id: string };
