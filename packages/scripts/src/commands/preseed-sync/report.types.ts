import { LegacySyncInventoryReportSchema } from "@scripts/commands/inventory-legacy-sync/report.types";
import { MigrateConnectionsReportSchema } from "@scripts/commands/migrate-connections/report.types";
import { MigratePendingIntentReportSchema } from "@scripts/commands/migrate-pending-intent/report.types";
import { MigrateProviderStateReportSchema } from "@scripts/commands/migrate-provider-state/report.types";
import { z } from "zod/v4";

export const PreseedPhaseSchema = z.enum([
  "inventory",
  "connections",
  "state",
  "pending",
  "all",
]);
export type PreseedPhase = z.infer<typeof PreseedPhaseSchema>;

export const PreseedModeSchema = z.enum(["live", "frozen"]);
export type PreseedMode = z.infer<typeof PreseedModeSchema>;

export const PreseedBlockerCodeSchema = z.enum([
  "inventory_duplicate",
  "inventory_orphan",
  "inventory_missing_authority",
  "inventory_blocking_skip",
  "connection_missing_refresh_token",
  "connection_empty_google_id",
  "connection_disconnected_in_sync",
  "connection_credential_unverified",
  "state_blocking_skip",
  "pending_blocking_skip",
  "frozen_residual_creates",
]);
export type PreseedBlockerCode = z.infer<typeof PreseedBlockerCodeSchema>;

export const PreseedFindingSchema = z.strictObject({
  code: PreseedBlockerCodeSchema.or(z.string().min(1)),
  phase: z.enum(["inventory", "connections", "state", "pending", "aggregate"]),
  id: z.string().min(1),
  detail: z.string().min(1),
});
export type PreseedFinding = z.infer<typeof PreseedFindingSchema>;

export const PreseedParitySchema = z.strictObject({
  ok: z.boolean(),
  blockers: z.array(PreseedFindingSchema),
  warnings: z.array(PreseedFindingSchema),
  counts: z.strictObject({
    unexplainedSkips: z.number().int().nonnegative(),
    duplicateIdentities: z.number().int().nonnegative(),
    orphans: z.number().int().nonnegative(),
    missingAuthority: z.number().int().nonnegative(),
    credentialVerifyFailures: z.number().int().nonnegative(),
    deltaCreates: z.number().int().nonnegative(),
    deltaUpdates: z.number().int().nonnegative(),
  }),
});
export type PreseedParity = z.infer<typeof PreseedParitySchema>;

export const PreseedParityReportSchema = z.strictObject({
  generatedAt: z.string().min(1),
  dryRun: z.boolean(),
  mode: PreseedModeSchema,
  phase: PreseedPhaseSchema,
  userIdFilter: z.array(z.string().min(1)).nullable(),
  phases: z.strictObject({
    inventory: LegacySyncInventoryReportSchema.optional(),
    connections: MigrateConnectionsReportSchema.optional(),
    providerState: MigrateProviderStateReportSchema.optional(),
    pendingIntent: MigratePendingIntentReportSchema.optional(),
  }),
  parity: PreseedParitySchema,
});
export type PreseedParityReport = z.infer<typeof PreseedParityReportSchema>;

export const PreseedExecutionRecordSchema = z.strictObject({
  schemaVersion: z.literal(1),
  kind: z.literal("sync-preseed-execution"),
  runId: z.string().min(1),
  startedAt: z.string().min(1),
  finishedAt: z.string().min(1),
  durationMs: z.number().int().nonnegative(),
  command: z.strictObject({
    argv: z.array(z.string()),
    dryRun: z.boolean(),
    apply: z.boolean(),
    mode: PreseedModeSchema,
    phase: PreseedPhaseSchema,
    userIdFilter: z.array(z.string().min(1)).nullable(),
    outDir: z.string().nullable(),
  }),
  environment: z.strictObject({
    gitSha: z.string().nullable(),
    nodeBun: z.string().min(1),
    compassApiMongoDbName: z.string().nullable(),
    syncMongoDbName: z.string().nullable(),
    workersEnabledByThisTool: z.literal(false),
    callbacksEnabledByThisTool: z.literal(false),
    sourceRecordsDeletedByThisTool: z.literal(false),
  }),
  phasesExecuted: z.array(
    z.strictObject({
      name: z.enum(["inventory", "connections", "state", "pending"]),
      startedAt: z.string().min(1),
      finishedAt: z.string().min(1),
      dryRun: z.boolean(),
      summaryCounts: z.record(z.string(), z.number()),
      artifactPath: z.string().min(1),
    }),
  ),
  parity: z.strictObject({
    ok: z.boolean(),
    blockerCount: z.number().int().nonnegative(),
    warningCount: z.number().int().nonnegative(),
    reportPath: z.string().min(1),
  }),
  exitCode: z.union([z.literal(0), z.literal(1)]),
});
export type PreseedExecutionRecord = z.infer<
  typeof PreseedExecutionRecordSchema
>;
