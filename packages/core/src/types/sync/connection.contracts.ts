import { z } from "zod/v4";
import { DateTimeSchema } from "@core/types/domain-primitives";
import {
  ConnectionIdSchema,
  PrincipalIdSchema,
  ProviderAccountIdSchema,
  ProviderCalendarIdSchema,
  ProviderCalendarSourceIdSchema,
  ProviderCapabilitySetSchema,
  ProviderKindSchema,
  TenantIdSchema,
} from "@core/types/sync/identity.contracts";

// Connection and calendar contracts for Compass Sync.
// Provider facts only — no credentials, and no product preferences
// (visibility, blocking, booking target) which belong to the Compass product
// layer.

// The one user-facing connection state. Only the shared health
// derivation may produce these values; no code path reports healthy because a
// single operation succeeded.
export const ConnectionStateSchema = z.enum([
  "connecting",
  "importing",
  "catchingUp",
  "healthy",
  "delayed",
  "actionRequired",
  "disconnected",
]);
export type ConnectionState = z.infer<typeof ConnectionStateSchema>;

// Sanitized reason exposed alongside delayed/actionRequired states.
export const ConnectionStateReasonSchema = z.enum([
  "authorizationRevoked",
  "authorizationExpired",
  "insufficientScopes",
  "permanentConflict",
  "workOverdue",
  "providerErrors",
]);
export type ConnectionStateReason = z.infer<typeof ConnectionStateReasonSchema>;

// Display facts about the authorized provider account. The stable
// providerAccountId is the only ownership proof; email is display data and
// may change without changing identity.
export const ProviderAccountFactsSchema = z.strictObject({
  providerAccountId: ProviderAccountIdSchema,
  email: z.string().trim().min(1).max(320).nullable(),
  displayName: z.string().trim().min(1).max(256).nullable(),
});
export type ProviderAccountFacts = z.infer<typeof ProviderAccountFactsSchema>;

const STATES_WITH_REASON: ReadonlySet<ConnectionState> = new Set([
  "delayed",
  "actionRequired",
]);

export const ProviderConnectionSchema = z
  .strictObject({
    id: ConnectionIdSchema,
    tenantId: TenantIdSchema,
    principalId: PrincipalIdSchema,
    provider: ProviderKindSchema,
    account: ProviderAccountFactsSchema,
    capabilities: ProviderCapabilitySetSchema,
    state: ConnectionStateSchema,
    // Present exactly when the state needs a user-facing explanation.
    stateReason: ConnectionStateReasonSchema.nullable(),
    // Evidence timestamps: data sync vs verified health are
    // distinct facts. Null until the first successful pass.
    lastSyncedAt: DateTimeSchema.nullable(),
    lastHealthyAt: DateTimeSchema.nullable(),
    createdAt: DateTimeSchema,
    updatedAt: DateTimeSchema,
  })
  .superRefine((connection, ctx) => {
    if (connection.state === "actionRequired" && !connection.stateReason) {
      ctx.addIssue({
        code: "custom",
        message: "actionRequired state requires a stateReason",
        path: ["stateReason"],
      });
    }
    if (connection.stateReason && !STATES_WITH_REASON.has(connection.state)) {
      ctx.addIssue({
        code: "custom",
        message: `stateReason is not allowed for state "${connection.state}"`,
        path: ["stateReason"],
      });
    }
  });
export type ProviderConnection = z.infer<typeof ProviderConnectionSchema>;

// Provider-neutral access role for a calendar. Normalized capabilities are
// the operational truth; the role is a display/diagnostic fact.
export const CalendarAccessRoleSchema = z.enum([
  "owner",
  "editor",
  "viewer",
  "busyOnly",
]);
export type CalendarAccessRole = z.infer<typeof CalendarAccessRoleSchema>;

export const CalendarCapabilitiesSchema = z.strictObject({
  canReadEvents: z.boolean(),
  canWriteEvents: z.boolean(),
  canReadBusy: z.boolean(),
  canInviteAttendees: z.boolean(),
});
export type CalendarCapabilities = z.infer<typeof CalendarCapabilitiesSchema>;

export const ProviderCalendarSchema = z.strictObject({
  id: ProviderCalendarIdSchema,
  tenantId: TenantIdSchema,
  principalId: PrincipalIdSchema,
  connectionId: ConnectionIdSchema,
  providerCalendarId: ProviderCalendarSourceIdSchema,
  displayName: z.string().trim().min(1).max(1024),
  color: z.string().trim().min(1).max(64).nullable(),
  // Provider facts: active reflects the provider/calendar-list
  // state, primary the provider's default-calendar designation.
  active: z.boolean(),
  primary: z.boolean(),
  accessRole: CalendarAccessRoleSchema,
  capabilities: CalendarCapabilitiesSchema,
  createdAt: DateTimeSchema,
  updatedAt: DateTimeSchema,
});
export type ProviderCalendar = z.infer<typeof ProviderCalendarSchema>;

export const ConnectionListResponseSchema = z.strictObject({
  connections: z.array(ProviderConnectionSchema).readonly(),
});
export type ConnectionListResponse = z.infer<
  typeof ConnectionListResponseSchema
>;

export const CalendarListQuerySchema = z.strictObject({
  // Optional narrowing; principal scope always comes from authenticated
  // context, never from the request body.
  connectionId: ConnectionIdSchema.optional(),
  activeOnly: z.boolean().optional(),
});
export type CalendarListQuery = z.infer<typeof CalendarListQuerySchema>;

export const CalendarListResponseSchema = z.strictObject({
  calendars: z.array(ProviderCalendarSchema).readonly(),
});
export type CalendarListResponse = z.infer<typeof CalendarListResponseSchema>;
