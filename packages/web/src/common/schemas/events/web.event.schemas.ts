import z from "zod";
import {
  CompassCoreEventSchema,
  CompassEventRecurrence,
} from "@core/types/event.types";

const WebEventRecurrence = z.union([
  z.undefined(),
  CompassEventRecurrence.omit({ rule: true }).extend({ rule: z.null() }),
  CompassEventRecurrence,
]);

export const WebCoreEventSchema = CompassCoreEventSchema.omit({
  recurrence: true,
}).extend({
  recurrence: WebEventRecurrence,
});

export type Schema_WebEvent = z.infer<typeof WebCoreEventSchema>;
