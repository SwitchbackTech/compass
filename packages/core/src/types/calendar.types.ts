import { z } from "zod/v4";
import { CalendarProvider } from "@core/types/event.types";
import { gSchema$CalendarListEntry } from "@core/types/gcal";
import {
  IDSchemaV4,
  RGBHexSchema,
  TimezoneSchema,
} from "@core/types/type.utils";

// @deprecated - will be replaced by Schema_Calendar
export interface Schema_CalendarList {
  user: string;
  google: {
    items: gSchema$CalendarListEntry[];
  };
}

export const GoogleCalendarMetadataSchema = z.object({
  id: z.string(),
  provider: z.literal(CalendarProvider.GOOGLE).default(CalendarProvider.GOOGLE),
  etag: z.string(),
  summary: z.string(),
  summaryOverride: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  accessRole: z.enum(["freeBusyReader", "reader", "writer", "owner"]),
  primary: z.boolean().default(false),
  conferenceProperties: z.object({
    allowedConferenceSolutionTypes: z.array(
      z.enum(["hangoutsMeet", "eventHangout", "eventNamedHangout"]),
    ),
  }),
  defaultReminders: z.array(
    z.object({
      method: z.enum(["email", "popup"]),
      minutes: z.number().int().min(0).max(40320), // gcal 4 weeks max
    }),
  ),
  notificationSettings: z
    .object({
      notifications: z.array(
        z.object({
          type: z.enum([
            "eventCreation",
            "eventChange",
            "eventCancellation",
            "eventResponse",
            "agenda",
          ]),
          method: z.enum(["email"]),
        }),
      ),
    })
    .optional(),
});

export const CompassCalendarSchema = z.object({
  _id: IDSchemaV4,
  user: IDSchemaV4,
  backgroundColor: RGBHexSchema,
  color: RGBHexSchema,
  selected: z.boolean().default(true),
  primary: z.boolean().default(false),
  timezone: TimezoneSchema.nullable().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().nullable().optional(),
  metadata: GoogleCalendarMetadataSchema, // use union when other providers present
});

export type CompassCalendar = z.infer<typeof CompassCalendarSchema>;
