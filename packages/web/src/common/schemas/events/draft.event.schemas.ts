import { ObjectId } from "bson";
import { z } from "zod";
import { ID_OPTIMISTIC_PREFIX, Origin } from "@core/constants/core.constants";
import { Schema_Event } from "@core/types/event.types";
import { WebCoreEventSchema } from "./web.event.schemas";

/** Schemas  */
export const OptimisticIdSchema = z
  .string()
  .refine(
    (id) =>
      id.startsWith(`${ID_OPTIMISTIC_PREFIX}-`) &&
      ObjectId.isValid(id.replace(`${ID_OPTIMISTIC_PREFIX}-`, "")),
  );

export const DraftEventSchema = WebCoreEventSchema.extend({
  _id: z.undefined(),
  origin: z.literal(Origin.COMPASS),
});

export const GridEventSchema = WebCoreEventSchema.extend({
  hasFlipped: z.boolean().optional(),
  isOpen: z.boolean().optional(),
  row: z.number().optional(),
  order: z.number().optional(), // allow carry over from Someday events
});

/** Types */
export type Schema_DraftEvent = z.infer<typeof DraftEventSchema>;

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
