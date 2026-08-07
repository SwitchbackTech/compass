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

// Opaque authenticated-encryption envelope for credentials sent between the
// Compass API and Sync services. The browser never sees this transport type.
export const EncryptedCredentialEnvelopeSchema = z.strictObject({
  iv: z.string().base64().min(1).max(128),
  ciphertext: z.string().base64().min(1).max(8192),
  authTag: z.string().base64().min(1).max(128),
});
export type EncryptedCredentialEnvelope = z.infer<
  typeof EncryptedCredentialEnvelopeSchema
>;

// Trusted Compass API → Sync handoff after the normal Google sign-in flow has
// exchanged an authorization code. This is intentionally an internal contract:
// the browser never receives or submits the credential.
export const GoogleConnectionAdoptionRequestSchema = z.strictObject({
  account: ProviderAccountFactsSchema,
  credential: EncryptedCredentialEnvelopeSchema,
  grantedScopes: z
    .array(z.string().trim().min(1).max(512))
    .min(1)
    .max(64)
    .readonly(),
});
export type GoogleConnectionAdoptionRequest = z.infer<
  typeof GoogleConnectionAdoptionRequestSchema
>;

export const GoogleConnectionAdoptionResponseSchema = z.strictObject({});
export type GoogleConnectionAdoptionResponse = z.infer<
  typeof GoogleConnectionAdoptionResponseSchema
>;

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
  .refine(
    (connection) =>
      connection.state !== "actionRequired" || connection.stateReason !== null,
    {
      message: "actionRequired state requires a stateReason",
      path: ["stateReason"],
    },
  )
  .refine(
    (connection) =>
      !connection.stateReason || STATES_WITH_REASON.has(connection.state),
    {
      message: "stateReason is only allowed for delayed or actionRequired",
      path: ["stateReason"],
    },
  );
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

// Start an OAuth authorization flow for the caller's principal. An optional
// connectionId means reconnect (rebind consent to that existing connection);
// omit it for a fresh connection. Principal scope always comes from the
// authenticated context, never the body.
export const ConnectionBeginRequestSchema = z.strictObject({
  connectionId: ConnectionIdSchema.optional(),
});
export type ConnectionBeginRequest = z.infer<
  typeof ConnectionBeginRequestSchema
>;

// The provider consent URL the browser is sent to. `begin` only mints the URL;
// the connection is created/updated when the provider calls back.
export const ConnectionBeginResponseSchema = z.strictObject({
  authorizationUrl: z.string().url(),
});
export type ConnectionBeginResponse = z.infer<
  typeof ConnectionBeginResponseSchema
>;

// User-triggered catch-up: enqueue an incremental pull for each events
// resource owned by the signed principal. `enqueued` is how many jobs were
// accepted (coalesced duplicates still count as one acceptance each).
export const ConnectionRefreshResponseSchema = z.strictObject({
  enqueued: z.number().int().nonnegative(),
});
export type ConnectionRefreshResponse = z.infer<
  typeof ConnectionRefreshResponseSchema
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
