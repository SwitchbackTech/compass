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
  .superRefine((connection, ctx) => {
    if (connection.state === "actionRequired" && !connection.stateReason) {
      ctx.addIssue({
        code: "custom",
        message: "actionRequired state requires a stateReason",
        path: ["stateReason"],
      });
    }
  });
export type ProviderConnectionRecord = z.infer<
  typeof ProviderConnectionRecordSchema
>;

// The fields a caller provides to create-or-update a connection by its stable
// provider-account identity. Sync owns _id, createdAt, and updatedAt.
export const ProviderConnectionUpsertSchema = z.strictObject({
  tenantId: TenantIdSchema,
  principalId: PrincipalIdSchema,
  provider: ProviderKindSchema,
  account: ProviderAccountFactsSchema,
  capabilities: ProviderCapabilitySetSchema,
  state: ConnectionStateSchema,
  stateReason: ConnectionStateReasonSchema.nullable(),
  lastSyncedAt: z.date().nullable(),
  lastHealthyAt: z.date().nullable(),
});
export type ProviderConnectionUpsert = z.infer<
  typeof ProviderConnectionUpsertSchema
>;
