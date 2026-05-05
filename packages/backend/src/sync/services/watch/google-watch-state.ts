import { type ClientSession } from "mongodb";
import { Resource_Sync } from "@core/types/sync.types";
import { type Schema_Watch } from "@core/types/watch.types";
import dayjs from "@core/util/date/dayjs";
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
  ...params,
});

const hasMissingSyncToken = (syncs: Array<{ nextSyncToken?: string | null }>) =>
  syncs.some(({ nextSyncToken }) => !nextSyncToken);

const unique = (values: string[]) => Array.from(new Set(values));

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

  const calendarListSyncs = sync.google.calendarlist ?? [];
  const eventSyncs = sync.google.events ?? [];

  if (
    calendarListSyncs.length === 0 ||
    eventSyncs.length === 0 ||
    hasMissingSyncToken(calendarListSyncs) ||
    hasMissingSyncToken(eventSyncs)
  ) {
    return createInspection({
      status: GoogleWatchStateStatus.FULL_REPAIR_REQUIRED,
      reason: "SYNC_TOKEN_MISSING",
    });
  }

  const expectedWatchCalendarIds = unique([
    Resource_Sync.CALENDAR,
    ...eventSyncs.map(({ gCalendarId }) => gCalendarId),
  ]);
  const expectedWatchCalendarIdSet = new Set(expectedWatchCalendarIds);
  const watches = await mongoService.watch.find({ user: userId }).toArray();
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
