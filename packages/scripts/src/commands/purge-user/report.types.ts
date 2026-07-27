import { z } from "zod/v4";
import { PrincipalPurgeResponseSchema } from "@core/types/sync/principal.contracts";

export const PurgeUserCountsSchema = z.strictObject({
  // Deleted by owning-calendar id, snapshotted before the calendars go. Covers
  // archived calendars too, which the account-deletion path misses.
  events: z.number().int().nonnegative(),
  calendars: z.number().int().nonnegative(),
  syncRecords: z.number().int().nonnegative(),
  watches: z.number().int().nonnegative(),
  legacyCalendarLists: z.number().int().nonnegative(),
  legacyEvents: z.number().int().nonnegative(),
  user: z.number().int().nonnegative(),
  sync: PrincipalPurgeResponseSchema,
});
export type PurgeUserCounts = z.infer<typeof PurgeUserCountsSchema>;

export const PurgeUserResultSchema = z.strictObject({
  userId: z.string().min(1),
  signedUpAt: z.string().nullable(),
  lastLoggedInAt: z.string().nullable(),
  counts: PurgeUserCountsSchema,
});
export type PurgeUserResult = z.infer<typeof PurgeUserResultSchema>;

export const PurgeUserAuthSchema = z.strictObject({
  superTokensUsers: z.number().int().nonnegative(),
  superTokensMappings: z.number().int().nonnegative(),
  superTokensMetadata: z.number().int().nonnegative(),
});
export type PurgeUserAuth = z.infer<typeof PurgeUserAuthSchema>;

// Staging and production share the `prod_calendar` database name, so the host
// is what tells an operator reviewing a dry run which one they are aimed at.
export const PurgeUserTargetSchema = z.strictObject({
  host: z.string().min(1),
  database: z.string().min(1),
  syncDatabase: z.string().min(1),
});
export type PurgeUserTarget = z.infer<typeof PurgeUserTargetSchema>;

export const PurgeUserReportSchema = z.strictObject({
  generatedAt: z.string().min(1),
  dryRun: z.boolean(),
  email: z.string().min(1),
  target: PurgeUserTargetSchema,
  users: z.array(PurgeUserResultSchema),
  waitlist: z.number().int().nonnegative(),
  // Null on dry-run, and null when SuperTokens cleanup failed - `authError`
  // says which. Mongo rows are already gone by then; see purge.ts.
  auth: PurgeUserAuthSchema.nullable(),
  authError: z.string().nullable(),
});
export type PurgeUserReport = z.infer<typeof PurgeUserReportSchema>;
