import { z } from "zod/v4";
import {
  ConnectionStateReasonSchema,
  ConnectionStateSchema,
  ProviderAccountFactsSchema,
} from "@core/types/sync/connection.contracts";
import {
  ConnectionIdSchema,
  PrincipalIdSchema,
  ProviderCapabilitySetSchema,
  ProviderKindSchema,
  TenantIdSchema,
} from "@core/types/sync/identity.contracts";

// A connection may only carry an actionRequired state with a reason attached
// (mirrors the wire contract's derivation invariant). Shared by the record and
// upsert schemas so the two cannot drift.
function refineActionRequiredReason(
  connection: { state: string; stateReason: string | null },
  ctx: z.RefinementCtx,
): void {
  if (connection.state === "actionRequired" && !connection.stateReason) {
    ctx.addIssue({
      code: "custom",
      message: "actionRequired state requires a stateReason",
      path: ["stateReason"],
    });
  }
}

// Persistence record for `provider_connections` (ledger S12). This is the
// stored shape: string ids (Mongo accepts a string _id, and the ids are the
// same opaque 24-hex values as the wire contracts) and Date timestamps for
// indexable range queries. The API layer (S24) maps this to the ISO-string
// ProviderConnection wire contract. Credential material is added in S19; product
// preferences (visibility, blocking, booking target) are NOT stored here.
export const ProviderConnectionRecordSchema = z
  .strictObject({
    _id: ConnectionIdSchema,
    tenantId: TenantIdSchema,
    principalId: PrincipalIdSchema,
    provider: ProviderKindSchema,
    account: ProviderAccountFactsSchema,
    capabilities: ProviderCapabilitySetSchema,
    state: ConnectionStateSchema,
    stateReason: ConnectionStateReasonSchema.nullable(),
    lastSyncedAt: z.date().nullable(),
    lastHealthyAt: z.date().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
  })
  .superRefine(refineActionRequiredReason);
export type ProviderConnectionRecord = z.infer<
  typeof ProviderConnectionRecordSchema
>;

// The fields a caller provides to create-or-update a connection by its stable
// provider-account identity. Sync owns _id, createdAt, and updatedAt. It shares
// the record's actionRequired->stateReason invariant so an invalid state can be
// rejected BEFORE the write lands — otherwise the write succeeds but every
// later read of that row fails to parse, bricking it.
export const ProviderConnectionUpsertSchema = z
  .strictObject({
    tenantId: TenantIdSchema,
    principalId: PrincipalIdSchema,
    provider: ProviderKindSchema,
    account: ProviderAccountFactsSchema,
    capabilities: ProviderCapabilitySetSchema,
    state: ConnectionStateSchema,
    stateReason: ConnectionStateReasonSchema.nullable(),
    lastSyncedAt: z.date().nullable(),
    lastHealthyAt: z.date().nullable(),
  })
  .superRefine(refineActionRequiredReason);
export type ProviderConnectionUpsert = z.infer<
  typeof ProviderConnectionUpsertSchema
>;
