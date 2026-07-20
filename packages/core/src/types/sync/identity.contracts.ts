import { z } from "zod/v4";
import { OBJECT_ID_STRING_PATTERN } from "@core/types/type.utils";

// Identity primitives for Compass Sync.
// Compass-issued ids are ObjectId-shaped; provider-issued ids are opaque
// strings scoped beneath the connection that issued them and must never be
// treated as globally unique or user-facing.

export const TenantIdSchema = z
  .string()
  .regex(OBJECT_ID_STRING_PATTERN)
  .brand<"TenantId">();
export type TenantId = z.infer<typeof TenantIdSchema>;

export const PrincipalIdSchema = z
  .string()
  .regex(OBJECT_ID_STRING_PATTERN)
  .brand<"PrincipalId">();
export type PrincipalId = z.infer<typeof PrincipalIdSchema>;

export const ConnectionIdSchema = z
  .string()
  .regex(OBJECT_ID_STRING_PATTERN)
  .brand<"ConnectionId">();
export type ConnectionId = z.infer<typeof ConnectionIdSchema>;

// Sync-issued stable id for a provider calendar record. Distinct from the
// provider's own calendar id (ProviderCalendarSourceId) so preferences and
// event ownership survive provider renames and reconnection.
export const ProviderCalendarIdSchema = z
  .string()
  .regex(OBJECT_ID_STRING_PATTERN)
  .brand<"ProviderCalendarId">();
export type ProviderCalendarId = z.infer<typeof ProviderCalendarIdSchema>;

export const SyncCommandIdSchema = z
  .string()
  .regex(OBJECT_ID_STRING_PATTERN)
  .brand<"SyncCommandId">();
export type SyncCommandId = z.infer<typeof SyncCommandIdSchema>;

export const SyncJobIdSchema = z
  .string()
  .regex(OBJECT_ID_STRING_PATTERN)
  .brand<"SyncJobId">();
export type SyncJobId = z.infer<typeof SyncJobIdSchema>;

export const ProviderKindSchema = z.enum(["google"]);
export type ProviderKind = z.infer<typeof ProviderKindSchema>;

// Stable subject issued by the provider for one authorized account (for
// Google, the OpenID `sub`). Ownership proof; email is display data only.
export const ProviderAccountIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(256)
  .brand<"ProviderAccountId">();
export type ProviderAccountId = z.infer<typeof ProviderAccountIdSchema>;

export const ProviderCalendarSourceIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(1024)
  .brand<"ProviderCalendarSourceId">();
export type ProviderCalendarSourceId = z.infer<
  typeof ProviderCalendarSourceIdSchema
>;

export const ProviderEventIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(1024)
  .brand<"ProviderEventId">();
export type ProviderEventId = z.infer<typeof ProviderEventIdSchema>;

// Caller-supplied key that makes durable commands safe to replay. Unique per
// (tenant, principal); the same key always refers to the same command.
export const IdempotencyKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(256)
  .brand<"IdempotencyKey">();
export type IdempotencyKey = z.infer<typeof IdempotencyKeySchema>;

// What a connection or calendar can actually do — the intersection of granted
// scopes, access role, provider semantics, and transport behavior. Domain
// code asks about capabilities instead of branching on provider names.
export const ProviderCapabilitySchema = z.enum([
  "readEvents",
  "writeEvents",
  "readBusy",
  "inviteAttendees",
  "changeNotifications",
  "incrementalChanges",
]);
export type ProviderCapability = z.infer<typeof ProviderCapabilitySchema>;

export const ProviderCapabilitySetSchema = z
  .array(ProviderCapabilitySchema)
  .refine(
    (capabilities) => new Set(capabilities).size === capabilities.length,
    {
      message: "Capabilities must be unique",
    },
  )
  .readonly();
export type ProviderCapabilitySet = z.infer<typeof ProviderCapabilitySetSchema>;
