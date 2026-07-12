import { type ClientSession } from "mongodb";
import { Resource_Sync } from "@core/types/sync.types";
import { type Schema_Watch } from "@core/types/watch.types";
import dayjs from "@core/util/date/dayjs";
import calendarService from "@backend/calendar/services/calendar.service";
import mongoService from "@backend/common/services/mongo.service";
import { getSync } from "@backend/sync/services/records/sync-records.repository";
import { isUsingGcalWebhookHttps } from "@backend/sync/services/watch/google-watch-config";
import {
  syncExpired,
  syncExpiresSoon,
} from "@backend/sync/services/watch/google-watch-timing";
import { findCompassUserBy } from "@backend/user/queries/user.queries";

export enum GoogleWatchStateStatus {
  NOT_APPLICABLE = "NOT_APPLICABLE",
  HEALTHY = "HEALTHY",
  REFRESH_REQUIRED = "REFRESH_REQUIRED",
  REPAIR_REQUIRED = "REPAIR_REQUIRED",
  FULL_REPAIR_REQUIRED = "FULL_REPAIR_REQUIRED",
}

export type GoogleWatchStateReason =
  | "GOOGLE_NOT_CONNECTED"
  | "PUBLIC_NOTIFICATIONS_DISABLED"
  | "SYNC_RECORD_MISSING"
  | "SYNC_TOKEN_MISSING"
  | "SYNC_INCOMPLETE"
  | "WATCHES_HEALTHY"
  | "WATCHES_EXPIRING_SOON"
  | "WATCHES_EXPIRED"
  | "WATCHES_MISSING"
  | "WATCHES_DUPLICATED"
  | "WATCHES_STALE";

export type GoogleWatchStateInspection = {
  status: GoogleWatchStateStatus;
  reason: GoogleWatchStateReason;
  expectedWatchCalendarIds: string[];
  activeWatches: Schema_Watch[];
  duplicateWatches: Schema_Watch[];
  expiredWatches: Schema_Watch[];
  missingWatchCalendarIds: string[];
  staleWatches: Schema_Watch[];
  watchesToRefresh: Schema_Watch[];
  // Active event-capable calendars whose events sync entry has no
  // nextSyncToken yet (absent, or mid-pagination with only a checkpoint
  // nextPageToken). Empty for every outcome except SYNC_INCOMPLETE.
  incompleteCalendarIds: string[];
};

const createInspection = (
  params: Partial<GoogleWatchStateInspection> &
    Pick<GoogleWatchStateInspection, "reason" | "status">,
): GoogleWatchStateInspection => ({
  expectedWatchCalendarIds: [],
  activeWatches: [],
  duplicateWatches: [],
  expiredWatches: [],
  missingWatchCalendarIds: [],
  staleWatches: [],
  watchesToRefresh: [],
  incompleteCalendarIds: [],
  ...params,
});

const unique = (values: string[]) => Array.from(new Set(values));

/**
 * Sorts stored watches into the buckets a repair coordinator needs and
 * picks one overall status/reason by precedence: expired > missing >
 * duplicated > stale > expiring > healthy. Pulled out of
 * `inspectGoogleWatchState` as a pure function because the unique
 * `(user, gCalendarId)` watch index makes duplicates practically
 * unseedable through a real insert - tests exercise duplicate/precedence
 * behavior by calling this directly with hand-built inputs.
 */
export const classifyWatchState = ({
  expectedWatchCalendarIds,
  watches,
}: {
  expectedWatchCalendarIds: string[];
  watches: Schema_Watch[];
}): GoogleWatchStateInspection => {
  const expectedWatchCalendarIdSet = new Set(expectedWatchCalendarIds);
  const activeWatches = watches.filter(
    ({ expiration }) => !syncExpired(expiration),
  );
  const expiredWatches = watches.filter(({ expiration }) =>
    syncExpired(expiration),
  );
  const staleWatches = watches.filter(
    ({ gCalendarId }) => !expectedWatchCalendarIdSet.has(gCalendarId),
  );
  const missingWatchCalendarIds = expectedWatchCalendarIds.filter(
    (gCalendarId) =>
      !activeWatches.some((watch) => watch.gCalendarId === gCalendarId),
  );
  const watchesToRefresh = activeWatches.filter(
    ({ gCalendarId, expiration }) =>
      expectedWatchCalendarIdSet.has(gCalendarId) &&
      syncExpiresSoon(expiration),
  );
  const duplicateWatches = expectedWatchCalendarIds.flatMap((gCalendarId) => {
    const matches = activeWatches.filter(
      (watch) => watch.gCalendarId === gCalendarId,
    );

    return matches.length > 1 ? matches : [];
  });
  const expectedExpiredWatches = expiredWatches.filter(({ gCalendarId }) =>
    expectedWatchCalendarIdSet.has(gCalendarId),
  );
  const base = {
    expectedWatchCalendarIds,
    activeWatches,
    duplicateWatches,
    expiredWatches,
    missingWatchCalendarIds,
    staleWatches,
    watchesToRefresh,
  };

  if (expectedExpiredWatches.length > 0) {
    return createInspection({
      ...base,
      status: GoogleWatchStateStatus.REPAIR_REQUIRED,
      reason: "WATCHES_EXPIRED",
    });
  }

  if (missingWatchCalendarIds.length > 0) {
    return createInspection({
      ...base,
      status: GoogleWatchStateStatus.REPAIR_REQUIRED,
      reason: "WATCHES_MISSING",
    });
  }

  if (duplicateWatches.length > 0) {
    return createInspection({
      ...base,
      status: GoogleWatchStateStatus.REPAIR_REQUIRED,
      reason: "WATCHES_DUPLICATED",
    });
  }

  if (staleWatches.length > 0) {
    return createInspection({
      ...base,
      status: GoogleWatchStateStatus.REPAIR_REQUIRED,
      reason: "WATCHES_STALE",
    });
  }

  if (watchesToRefresh.length > 0) {
    return createInspection({
      ...base,
      status: GoogleWatchStateStatus.REFRESH_REQUIRED,
      reason: "WATCHES_EXPIRING_SOON",
    });
  }

  return createInspection({
    ...base,
    status: GoogleWatchStateStatus.HEALTHY,
    reason: "WATCHES_HEALTHY",
  });
};

/**
 * Cheap, read-only classification of a user's Google watch health, built
 * entirely from Compass-owned state (no Google API calls) so it is safe to
 * call defensively/often. A later repair coordinator acts on the result;
 * this function only inspects and reports.
 */
export const inspectGoogleWatchState = async (
  userId: string,
): Promise<GoogleWatchStateInspection> => {
  const user = await findCompassUserBy("_id", userId);
  const hasGoogleCredentials = Boolean(
    user?.google?.googleId && user.google.gRefreshToken,
  );

  if (!hasGoogleCredentials) {
    return createInspection({
      status: GoogleWatchStateStatus.NOT_APPLICABLE,
      reason: "GOOGLE_NOT_CONNECTED",
    });
  }

  if (!isUsingGcalWebhookHttps()) {
    return createInspection({
      status: GoogleWatchStateStatus.NOT_APPLICABLE,
      reason: "PUBLIC_NOTIFICATIONS_DISABLED",
    });
  }

  const sync = await getSync({ userId });

  if (!sync?.google) {
    return createInspection({
      status: GoogleWatchStateStatus.FULL_REPAIR_REQUIRED,
      reason: "SYNC_RECORD_MISSING",
    });
  }

  const calendarListToken = (sync.google.calendarlist ?? []).find(
    (entry) => entry.gCalendarId === Resource_Sync.CALENDAR,
  )?.nextSyncToken;

  if (!calendarListToken) {
    return createInspection({
      status: GoogleWatchStateStatus.FULL_REPAIR_REQUIRED,
      reason: "SYNC_TOKEN_MISSING",
    });
  }

  // Expected watches are calendar-record-driven (not sync-entry-driven):
  // an events sync entry surviving for an archived/freeBusyReader calendar
  // must NOT keep that calendar "expected" (its watch, if any, is stale).
  const eventSyncs = sync.google.events ?? [];
  const activeGoogleCalendars =
    await calendarService.getActiveGoogleCalendars(userId);
  const eventCapableCalendarIds: string[] = [];
  const incompleteCalendarIds: string[] = [];

  for (const record of activeGoogleCalendars) {
    if (record.source.provider !== "google") continue;
    // A7: freeBusyReader calendars have no Events watch or incremental
    // token - availability is a bounded on-demand query, not a sync target.
    if (record.access === "freeBusyReader") continue;

    const gCalendarId = record.source.calendarId;
    eventCapableCalendarIds.push(gCalendarId);

    const hasSyncToken = eventSyncs.some(
      (entry) =>
        entry.gCalendarId === gCalendarId && Boolean(entry.nextSyncToken),
    );

    if (!hasSyncToken) incompleteCalendarIds.push(gCalendarId);
  }

  if (incompleteCalendarIds.length > 0) {
    return createInspection({
      status: GoogleWatchStateStatus.FULL_REPAIR_REQUIRED,
      reason: "SYNC_INCOMPLETE",
      incompleteCalendarIds,
    });
  }

  const expectedWatchCalendarIds = unique([
    Resource_Sync.CALENDAR,
    ...eventCapableCalendarIds,
  ]);

  // Read with a plain find, never `WatchSchema.parse`: its
  // ExpirationDateSchema requires a future date (correct on the write
  // path), but finding already-EXPIRED watches is this inspector's job.
  const watches = await mongoService.watch.find({ user: userId }).toArray();

  return classifyWatchState({ expectedWatchCalendarIds, watches });
};

export const isWatchingGoogleResource = async (
  userId: string,
  gCalendarId: string,
  session?: ClientSession,
) => {
  const watch = await mongoService.watch.findOne(
    { user: userId, gCalendarId },
    { session },
  );

  if (!watch) return false;

  const expired = dayjs(watch.expiration).isSameOrBefore(dayjs());

  if (expired) {
    await mongoService.watch.deleteOne(
      { user: userId, gCalendarId },
      { session },
    );

    return false;
  }

  return true;
};
