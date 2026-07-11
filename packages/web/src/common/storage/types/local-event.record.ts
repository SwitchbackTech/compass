import { z } from "zod/v4";
import { EventSchema } from "@core/types/event.contracts";

// There is no syncState field (A35): local sync is push-all-then-clear on
// connect, so a per-record state machine models a queue that does not exist.
export const LocalEventRecordSchema = z
  .strictObject({
    version: z.literal(2),
    id: EventSchema.shape.id,
    event: EventSchema,
    isDemo: z.boolean(),
  })
  // IndexedDB keys on the duplicated top-level id, so it must always match
  // the nested event's own id.
  .refine(({ id, event }) => id === event.id, {
    message: "Top-level id must match event.id",
    path: ["id"],
  });
export type LocalEventRecord = z.infer<typeof LocalEventRecordSchema>;
