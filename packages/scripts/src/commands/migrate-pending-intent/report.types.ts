import { z } from "zod/v4";

export const MigratePendingIntentSkipCategorySchema = z.enum([
  "already_provider_linked",
  "occurrence_not_backfillable",
  "busy_not_eligible",
  "outside_sync_horizon",
  "missing_selected_target",
  "missing_connection",
  "orphan_event",
  "unmappable_event",
  "read_only_target",
  "target_not_owned",
  "no_google_identity",
]);
export type MigratePendingIntentSkipCategory = z.infer<
  typeof MigratePendingIntentSkipCategorySchema
>;

export const MigratePendingIntentSkipSchema = z.strictObject({
  category: MigratePendingIntentSkipCategorySchema,
  id: z.string().min(1),
  detail: z.string().min(1),
});
export type MigratePendingIntentSkip = z.infer<
  typeof MigratePendingIntentSkipSchema
>;

export const MigratePendingIntentUserActionSchema = z.enum([
  "would_migrate",
  "migrated",
  "skipped",
]);

export const MigratePendingIntentUserResultSchema = z.strictObject({
  userId: z.string().min(1),
  tenantId: z.string().min(1),
  principalId: z.string().min(1),
  connectionId: z.string().nullable(),
  targetCalendarId: z.string().nullable(),
  action: MigratePendingIntentUserActionSchema,
  skipCategory: MigratePendingIntentSkipCategorySchema.nullable(),
  detail: z.string().min(1),
  counts: z.strictObject({
    eventsUpserted: z.number().int().nonnegative(),
    commandsSubmitted: z.number().int().nonnegative(),
    commandsAlreadyPresent: z.number().int().nonnegative(),
  }),
});
export type MigratePendingIntentUserResult = z.infer<
  typeof MigratePendingIntentUserResultSchema
>;

export const MigratePendingIntentReportSchema = z.strictObject({
  generatedAt: z.string().min(1),
  dryRun: z.boolean(),
  counts: z.strictObject({
    usersScanned: z.number().int().nonnegative(),
    usersMigrated: z.number().int().nonnegative(),
    usersWouldMigrate: z.number().int().nonnegative(),
    usersSkipped: z.number().int().nonnegative(),
    eventsCreated: z.number().int().nonnegative(),
    eventsUpdated: z.number().int().nonnegative(),
    eventsWouldCreate: z.number().int().nonnegative(),
    eventsWouldUpdate: z.number().int().nonnegative(),
    eventsSkipped: z.number().int().nonnegative(),
    commandsCreated: z.number().int().nonnegative(),
    commandsAlreadyPresent: z.number().int().nonnegative(),
    commandsWouldCreate: z.number().int().nonnegative(),
    commandsSkipped: z.number().int().nonnegative(),
  }),
  users: z.array(MigratePendingIntentUserResultSchema),
  skips: z.array(MigratePendingIntentSkipSchema),
});
export type MigratePendingIntentReport = z.infer<
  typeof MigratePendingIntentReportSchema
>;
