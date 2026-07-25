import { z } from "zod/v4";

export const MigrateConnectionSkipCategorySchema = z.enum([
  "no_google_identity",
  "missing_refresh_token",
  "empty_google_id",
]);
export type MigrateConnectionSkipCategory = z.infer<
  typeof MigrateConnectionSkipCategorySchema
>;

export const MigrateConnectionActionSchema = z.enum([
  "would_create",
  "would_update",
  "created",
  "updated",
  "skipped",
]);

export const MigrateConnectionResultSchema = z.strictObject({
  userId: z.string().min(1),
  tenantId: z.string().min(1),
  principalId: z.string().min(1),
  providerAccountId: z.string().nullable(),
  accountEmail: z.string().nullable(),
  action: MigrateConnectionActionSchema,
  connectionId: z.string().nullable(),
  // Read-back after apply: credential present with expected scopes (no provider call).
  credentialVerified: z.boolean(),
  skipCategory: MigrateConnectionSkipCategorySchema.nullable(),
  detail: z.string().min(1),
});
export type MigrateConnectionResult = z.infer<
  typeof MigrateConnectionResultSchema
>;

export const MigrateConnectionsReportSchema = z.strictObject({
  generatedAt: z.string().min(1),
  dryRun: z.boolean(),
  counts: z.strictObject({
    scanned: z.number().int().nonnegative(),
    wouldCreate: z.number().int().nonnegative(),
    wouldUpdate: z.number().int().nonnegative(),
    created: z.number().int().nonnegative(),
    updated: z.number().int().nonnegative(),
    skipped: z.number().int().nonnegative(),
  }),
  results: z.array(MigrateConnectionResultSchema),
});
export type MigrateConnectionsReport = z.infer<
  typeof MigrateConnectionsReportSchema
>;
