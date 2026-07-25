import { z } from "zod/v4";

// Categorized skips for the S46 inventory. Every skip must use one of these;
// unexplained skips block cutover later (05-migration-and-rollout.md).
export const InventorySkipCategorySchema = z.enum([
  "no_google_identity",
  "missing_refresh_token",
  "orphan_calendar",
  "orphan_event",
  "orphan_sync",
  "orphan_watch",
  "orphan_cursor_calendar",
  "orphan_watch_calendar",
  "duplicate_google_calendar",
  "duplicate_sync_user",
  "duplicate_watch",
  "legacy_nested_watch",
]);
export type InventorySkipCategory = z.infer<typeof InventorySkipCategorySchema>;

export const InventorySkipSchema = z.strictObject({
  category: InventorySkipCategorySchema,
  id: z.string().min(1),
  detail: z.string().min(1),
});
export type InventorySkip = z.infer<typeof InventorySkipSchema>;

export const InventoryDuplicateSchema = z.strictObject({
  kind: z.enum(["google_calendar_identity", "sync_user", "watch_identity"]),
  key: z.string().min(1),
  count: z.number().int().positive(),
  ids: z.array(z.string().min(1)),
});
export type InventoryDuplicate = z.infer<typeof InventoryDuplicateSchema>;

export const InventoryOrphanSchema = z.strictObject({
  kind: z.enum([
    "calendar",
    "event",
    "sync",
    "watch",
    "cursor_calendar",
    "watch_calendar",
  ]),
  id: z.string().min(1),
  reason: z.string().min(1),
});
export type InventoryOrphan = z.infer<typeof InventoryOrphanSchema>;

export const InventoryMissingAuthoritySchema = z.strictObject({
  userId: z.string().min(1),
  reason: z.enum(["no_google", "empty_refresh_token", "empty_google_id"]),
});
export type InventoryMissingAuthority = z.infer<
  typeof InventoryMissingAuthoritySchema
>;

export const InventorySyncResourceTargetSchema = z.strictObject({
  resourceKind: z.enum(["calendarList", "events"]),
  gCalendarId: z.string().nullable(),
  hasCursor: z.boolean(),
  hasWatch: z.boolean(),
});

export const InventoryUserTargetSchema = z.strictObject({
  userId: z.string().min(1),
  tenantId: z.string().min(1),
  principalId: z.string().min(1),
  providerAccountId: z.string().nullable(),
  accountEmail: z.string().nullable(),
  hasRefreshToken: z.boolean(),
  calendarTargets: z.array(
    z.strictObject({
      compassCalendarId: z.string().min(1),
      providerCalendarId: z.string().min(1),
    }),
  ),
  eventTargets: z.strictObject({
    linkedGoogle: z.number().int().nonnegative(),
    unlinkedPendingIntent: z.number().int().nonnegative(),
  }),
  syncResourceTargets: z.array(InventorySyncResourceTargetSchema),
});
export type InventoryUserTarget = z.infer<typeof InventoryUserTargetSchema>;

export const LegacySyncInventoryReportSchema = z.strictObject({
  generatedAt: z.string().min(1),
  dryRun: z.literal(true),
  source: z.strictObject({
    users: z.strictObject({
      total: z.number().int().nonnegative(),
      withGoogle: z.number().int().nonnegative(),
      withRefreshToken: z.number().int().nonnegative(),
      missingToken: z.number().int().nonnegative(),
    }),
    calendars: z.strictObject({
      total: z.number().int().nonnegative(),
      google: z.number().int().nonnegative(),
      local: z.number().int().nonnegative(),
    }),
    events: z.strictObject({
      total: z.number().int().nonnegative(),
      linkedGoogle: z.number().int().nonnegative(),
      unlinked: z.number().int().nonnegative(),
    }),
    syncDocs: z.strictObject({
      total: z.number().int().nonnegative(),
      eventCursorRows: z.number().int().nonnegative(),
      calendarListCursorRows: z.number().int().nonnegative(),
    }),
    watches: z.strictObject({
      total: z.number().int().nonnegative(),
      eventWatches: z.number().int().nonnegative(),
      calendarListWatches: z.number().int().nonnegative(),
      expired: z.number().int().nonnegative(),
    }),
  }),
  targets: z.array(InventoryUserTargetSchema),
  duplicates: z.array(InventoryDuplicateSchema),
  orphans: z.array(InventoryOrphanSchema),
  missingAuthority: z.array(InventoryMissingAuthoritySchema),
  skips: z.array(InventorySkipSchema),
  counts: z.strictObject({
    scanned: z.number().int().nonnegative(),
    reportable: z.number().int().nonnegative(),
    skipped: z.number().int().nonnegative(),
  }),
});
export type LegacySyncInventoryReport = z.infer<
  typeof LegacySyncInventoryReportSchema
>;
