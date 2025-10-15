import { z } from "zod/v4";
import { Resource_Sync } from "@core/types/sync.types";
import { IDSchemaV4, zObjectId } from "@core/types/type.utils";
import dayjs from "@core/util/date/dayjs";

/**
 * Watch collection schema for Google Calendar push notification channels
 *
 * This schema stores channel metadata for Google Calendar push notifications
 * to enable reliable lifecycle management of channels (creation, renewal,
 * expiration, deletion) separately from sync data.
 */
export const WatchSchema = z.object({
  _id: zObjectId, // channel_id - unique identifier for the notification channel
  user: IDSchemaV4, // user who owns this watch channel
  resourceId: z.string().nonempty(), // Google Calendar resource identifier
  expiration: z
    .pipe(
      z.custom<Date | string>((v) => dayjs(v as string).isValid()),
      z.transform((v) => dayjs(v).toDate()),
    )
    .pipe(z.date().min(dayjs().add(5, "minutes").toDate())), // when the channel expires - has a 5 minutes buffer
  gCalendarId: z.string().nonempty(), // which gCalendarId this watch is for (use Resource_Sync.CALENDAR for calendar list watches)
  createdAt: z
    .date()
    .optional()
    .default(() => new Date()), // when this watch was created
});

export const ChannelTokenSchema = z.object({
  token: z.string().nonempty(),
  resource: z.enum(Resource_Sync),
});

export type ChannelToken = z.infer<typeof ChannelTokenSchema>;

export type Schema_Watch = z.infer<typeof WatchSchema>;
