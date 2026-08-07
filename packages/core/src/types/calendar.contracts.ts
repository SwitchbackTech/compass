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
  // Email of the connected provider account this calendar belongs to. This is
  // the calendar's only account identity on the wire: emails are unique per
  // user (one Google account = one connection), so grouping and labelling key
  // off it directly. Absent for the local calendar, and for provider accounts
  // that reported no email.
  accountEmail: z.string().optional(),
});
export type Calendar = z.infer<typeof CalendarSchema>;

export const CalendarListResponseSchema = z.strictObject({
  calendars: z.array(CalendarSchema),
});
export type CalendarListResponse = z.infer<typeof CalendarListResponseSchema>;

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
