import { z } from "zod";
import { idSchema } from "@core/types/event.types";
import { OptimisticIdSchema } from "./draft.event.schemas";
import { WebCoreEventSchema } from "./web.event.schemas";

export const SomedayEventSchema = WebCoreEventSchema.extend({
  _id: z.union([idSchema, OptimisticIdSchema]),
  isSomeday: z.literal(true),
  order: z.number(),
});

export type Schema_SomedayEvent = z.infer<typeof SomedayEventSchema>;
