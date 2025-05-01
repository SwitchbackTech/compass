import { ObjectId } from "mongodb";
import { z } from "zod";
import { CoreEventSchema } from "@core/types/event.types";

const zObjectId = z.instanceof(ObjectId);

/**
 * Schema for internal events that match how they
 * are saved to the DB
 */
export const Schema_Event_API = CoreEventSchema.extend({
  _id: zObjectId.optional(),
});

export type Event_API = z.infer<typeof Schema_Event_API>;
