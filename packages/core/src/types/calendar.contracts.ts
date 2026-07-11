import { z } from "zod/v4";
import {
  CalendarIdSchema,
  HexColorSchema,
  TimeZoneSchema,
} from "@core/types/domain-primitives";

export const CalendarProviderSchema = z.enum(["local", "google"]);
export type CalendarProvider = z.infer<typeof CalendarProviderSchema>;

export const CalendarAccessSchema = z.enum([
  "owner",
  "writer",
  "reader",
  "freeBusyReader",
]);
export type CalendarAccess = z.infer<typeof CalendarAccessSchema>;

export const CalendarCapabilitiesSchema = z.strictObject({
  canReadAvailability: z.boolean(),
  canReadDetails: z.boolean(),
  canWrite: z.boolean(),
  canManage: z.boolean(),
  canWatchEvents: z.boolean(),
});
export type CalendarCapabilities = z.infer<typeof CalendarCapabilitiesSchema>;

export const CalendarSchema = z.strictObject({
  id: CalendarIdSchema,
  name: z.string(),
  description: z.string(),
  timeZone: TimeZoneSchema.nullable(),
  foregroundColor: HexColorSchema,
  backgroundColor: HexColorSchema,
  provider: CalendarProviderSchema,
  access: CalendarAccessSchema,
  capabilities: CalendarCapabilitiesSchema,
  isPrimary: z.boolean(),
  isVisible: z.boolean(),
  isActive: z.boolean(),
});
export type Calendar = z.infer<typeof CalendarSchema>;

export const CalendarListResponseSchema = z.strictObject({
  calendars: z.array(CalendarSchema),
});
export type CalendarListResponse = z.infer<typeof CalendarListResponseSchema>;

export const SetCalendarVisibilityInputSchema = z
  .array(
    z.strictObject({
      calendarId: CalendarIdSchema,
      isVisible: z.boolean(),
    }),
  )
  .nonempty();
export type SetCalendarVisibilityInput = z.infer<
  typeof SetCalendarVisibilityInputSchema
>;

export const CAPABILITIES_BY_ACCESS = {
  owner: {
    canReadAvailability: true,
    canReadDetails: true,
    canWrite: true,
    canManage: true,
    canWatchEvents: true,
  },
  writer: {
    canReadAvailability: true,
    canReadDetails: true,
    canWrite: true,
    canManage: false,
    canWatchEvents: true,
  },
  reader: {
    canReadAvailability: true,
    canReadDetails: true,
    canWrite: false,
    canManage: false,
    canWatchEvents: true,
  },
  freeBusyReader: {
    canReadAvailability: true,
    canReadDetails: false,
    canWrite: false,
    canManage: false,
    canWatchEvents: false,
  },
} as const satisfies Record<CalendarAccess, CalendarCapabilities>;

export const getCalendarCapabilities = (
  access: CalendarAccess,
): CalendarCapabilities => CAPABILITIES_BY_ACCESS[access];
