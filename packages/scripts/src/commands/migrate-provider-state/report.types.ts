import { z } from "zod/v4";

export const MigrateProviderStateSkipCategorySchema = z.enum([
  "no_google_identity",
  "missing_connection",
  "disconnected_in_sync",
  "orphan_calendar",
  "orphan_event",
  "orphan_cursor",
  "duplicate_google_calendar",
  "local_calendar",
  "unlinked_deferred",
  "subscription_requires_rewatch",
  "missing_provider_event_id",
  "missing_series_master",
  "unmappable_event",
]);
export type MigrateProviderStateSkipCategory = z.infer<
  typeof MigrateProviderStateSkipCategorySchema
>;

export const MigrateProviderStateSkipSchema = z.strictObject({
  category: MigrateProviderStateSkipCategorySchema,
  id: z.string().min(1),
  detail: z.string().min(1),
});
export type MigrateProviderStateSkip = z.infer<
  typeof MigrateProviderStateSkipSchema
>;

export const MigrateProviderStateUserActionSchema = z.enum([
  "would_migrate",
  "migrated",
  "skipped",
]);

export const MigrateProviderStateUserResultSchema = z.strictObject({
  userId: z.string().min(1),
  tenantId: z.string().min(1),
  principalId: z.string().min(1),
  connectionId: z.string().nullable(),
  action: MigrateProviderStateUserActionSchema,
  skipCategory: MigrateProviderStateSkipCategorySchema.nullable(),
  detail: z.string().min(1),
  counts: z.strictObject({
    calendarsUpserted: z.number().int().nonnegative(),
    eventsUpserted: z.number().int().nonnegative(),
    syncResourcesUpserted: z.number().int().nonnegative(),
    unlinkedDeferred: z.number().int().nonnegative(),
    watchesSkippedRewatch: z.number().int().nonnegative(),
  }),
});
export type MigrateProviderStateUserResult = z.infer<
  typeof MigrateProviderStateUserResultSchema
>;

export const MigrateProviderStateSampleSchema = z.strictObject({
  sourceEventId: z.string().min(1),
  providerEventId: z.string().min(1),
  title: z.string(),
  recurrenceKind: z.string().min(1),
  scheduleKind: z.string().min(1),
});
export type MigrateProviderStateSample = z.infer<
  typeof MigrateProviderStateSampleSchema
>;

export const MigrateProviderStateReportSchema = z.strictObject({
  generatedAt: z.string().min(1),
  dryRun: z.boolean(),
  counts: z.strictObject({
    usersScanned: z.number().int().nonnegative(),
    usersMigrated: z.number().int().nonnegative(),
    usersWouldMigrate: z.number().int().nonnegative(),
    usersSkipped: z.number().int().nonnegative(),
    calendarsCreated: z.number().int().nonnegative(),
    calendarsUpdated: z.number().int().nonnegative(),
    calendarsWouldCreate: z.number().int().nonnegative(),
    calendarsWouldUpdate: z.number().int().nonnegative(),
    calendarsSkipped: z.number().int().nonnegative(),
    eventsCreated: z.number().int().nonnegative(),
    eventsUpdated: z.number().int().nonnegative(),
    eventsWouldCreate: z.number().int().nonnegative(),
    eventsWouldUpdate: z.number().int().nonnegative(),
    eventsSkipped: z.number().int().nonnegative(),
    syncResourcesCreated: z.number().int().nonnegative(),
    syncResourcesUpdated: z.number().int().nonnegative(),
    syncResourcesWouldCreate: z.number().int().nonnegative(),
    syncResourcesWouldUpdate: z.number().int().nonnegative(),
    syncResourcesSkipped: z.number().int().nonnegative(),
    watchesSkippedRewatch: z.number().int().nonnegative(),
    unlinkedDeferred: z.number().int().nonnegative(),
  }),
  users: z.array(MigrateProviderStateUserResultSchema),
  skips: z.array(MigrateProviderStateSkipSchema),
  samples: z.array(MigrateProviderStateSampleSchema),
});
export type MigrateProviderStateReport = z.infer<
  typeof MigrateProviderStateReportSchema
>;
