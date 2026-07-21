import { z } from "zod/v4";
import {
  CalendarAccessRoleSchema,
  CalendarCapabilitiesSchema,
} from "@core/types/sync/connection.contracts";
import {
  ConnectionIdSchema,
  PrincipalIdSchema,
  ProviderCalendarIdSchema,
  ProviderCalendarSourceIdSchema,
  TenantIdSchema,
} from "@core/types/sync/identity.contracts";

// Persistence record for `provider_calendars`. Provider FACTS
// only — `active`/`primary`/`accessRole`/`capabilities` reflect what the
// provider reports. Product preferences (visible, blocksAvailability,
// bookingTarget) are owned by the Compass booking module, never stored here —
// do not store product visibility or booking prefs.
export const ProviderCalendarRecordSchema = z.strictObject({
  _id: ProviderCalendarIdSchema,
  tenantId: TenantIdSchema,
  principalId: PrincipalIdSchema,
  connectionId: ConnectionIdSchema,
  providerCalendarId: ProviderCalendarSourceIdSchema,
  displayName: z.string().trim().min(1).max(1024),
  color: z.string().trim().min(1).max(64).nullable(),
  active: z.boolean(),
  primary: z.boolean(),
  accessRole: CalendarAccessRoleSchema,
  capabilities: CalendarCapabilitiesSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type ProviderCalendarRecord = z.infer<
  typeof ProviderCalendarRecordSchema
>;

export const ProviderCalendarUpsertSchema = z.strictObject({
  tenantId: TenantIdSchema,
  principalId: PrincipalIdSchema,
  connectionId: ConnectionIdSchema,
  providerCalendarId: ProviderCalendarSourceIdSchema,
  displayName: z.string().trim().min(1).max(1024),
  color: z.string().trim().min(1).max(64).nullable(),
  active: z.boolean(),
  primary: z.boolean(),
  accessRole: CalendarAccessRoleSchema,
  capabilities: CalendarCapabilitiesSchema,
});
export type ProviderCalendarUpsert = z.infer<
  typeof ProviderCalendarUpsertSchema
>;
