import { z } from "zod/v4";
import { IDSchemaV4 } from "@core/types/type.utils";

/**
 * Watch collection schema for Google Calendar push notification channels
 *
 * This schema stores channel metadata for Google Calendar push notifications
 * to enable reliable lifecycle management of channels (creation, renewal,
 * expiration, deletion) separately from sync data.
 */
export const WatchSchema = z.object({
  _id: z.string(), // channel_id - unique identifier for the notification channel
  user: IDSchemaV4, // user who owns this watch channel
  resourceId: z.string(), // Google Calendar resource identifier
  expiration: z.date(), // when the channel expires
  createdAt: z
    .date()
    .optional()
    .default(() => new Date()), // when this watch was created
});

export type Watch = z.infer<typeof WatchSchema>;
