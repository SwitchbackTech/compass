import { Logger } from "@core/logger/winston.logger";
import { type Params_WatchEvents } from "@core/types/sync.types";
import dayjs from "@core/util/date/dayjs";
import {
  isFullSyncRequired,
  isInvalidGoogleToken,
} from "@backend/common/services/gcal/gcal.utils";
import mongoService from "@backend/common/services/mongo.service";
import { getGcalClient } from "@backend/sync/services/google-sync/gcal.client";
import { googleCalendarSyncService } from "@backend/sync/services/google-sync/google-sync.service";
import { googleWatchService } from "@backend/sync/services/watch/google-watch.service";
import {
  type GoogleWatchStateInspection,
  GoogleWatchStateStatus,
  inspectGoogleWatchState,
} from "@backend/sync/services/watch/google-watch-state";

const logger = Logger("app:google-watch-repair.service");
const WATCH_REPAIR_COOLDOWN_MS = 5 * 60 * 1000;
const activeGoogleWatchRepairs = new Set<string>();

export type GoogleWatchRepairAction =
  | "IGNORED"
  | "LOCKED"
  | "COOLDOWN"
  | "REFRESHED"
  | "REPAIRED"
  | "FULL_REPAIR_STARTED";

export type GoogleWatchRepairResult = {
  action: GoogleWatchRepairAction;
  reason: GoogleWatchStateInspection["reason"] | "LOCKED" | "COOLDOWN";
};

const getLastRepairAttemptAt = async (
  userId: string,
): Promise<Date | undefined> => {
  const sync = await mongoService.sync.findOne({ user: userId });

  return sync?.googleWatchRepair?.lastAttemptAt;
};

const isRepairCooldownActive = async (userId: string) => {
  const lastAttemptAt = await getLastRepairAttemptAt(userId);

  if (!lastAttemptAt) return false;

  return dayjs(lastAttemptAt)
    .add(WATCH_REPAIR_COOLDOWN_MS, "millisecond")
    .isAfter(dayjs());
};

const markRepairAttempt = async (userId: string) => {
  await mongoService.sync.updateOne(
    { user: userId },
    { $set: { "googleWatchRepair.lastAttemptAt": new Date() } },
    { upsert: true },
  );
};

const runFullRepairInBackground = (userId: string) => {
  googleCalendarSyncService.repairGoogleCalendarSync(userId).catch((error) => {
    logger.error(
      `Google Watch repair could not start full Google sync repair for user: ${userId}`,
      error,
    );
  });
};

const toRefreshPayload = ({
  _id,
  resourceId,
  expiration,
  gCalendarId,
}: GoogleWatchStateInspection["watchesToRefresh"][number]): Params_WatchEvents => ({
  channelId: _id.toString(),
  expiration: expiration.getTime().toString(),
  gCalendarId,
  resourceId,
});

async function refreshExpiringWatches(
  userId: string,
  state: GoogleWatchStateInspection,
): Promise<GoogleWatchRepairResult> {
  const gcal = await getGcalClient(userId);

  await Promise.all(
    state.watchesToRefresh.map((watch) =>
      googleWatchService.refreshWatch(userId, toRefreshPayload(watch), gcal),
    ),
  );

  return { action: "REFRESHED", reason: state.reason };
}

async function recreateWatchesAndCatchUp(
  userId: string,
  state: GoogleWatchStateInspection,
): Promise<GoogleWatchRepairResult> {
  const gcal = await getGcalClient(userId);

  await googleWatchService.stopWatches(userId, gcal);
  await mongoService.watch.deleteMany({ user: userId });

  try {
    await googleCalendarSyncService.importLatestGoogleCalendarChanges(
      userId,
      gcal,
      1000,
      { force: true },
    );

    return { action: "REPAIRED", reason: state.reason };
  } catch (error) {
    if (isFullSyncRequired(error as Error) || isInvalidGoogleToken(error)) {
      runFullRepairInBackground(userId);

      return { action: "FULL_REPAIR_STARTED", reason: state.reason };
    }

    throw error;
  }
}

async function ensureGoogleWatches(
  userId: string,
  options: { force?: boolean; state?: GoogleWatchStateInspection } = {},
): Promise<GoogleWatchRepairResult> {
  const state = options.state ?? (await inspectGoogleWatchState(userId));

  if (
    state.status === GoogleWatchStateStatus.NOT_APPLICABLE ||
    state.status === GoogleWatchStateStatus.HEALTHY
  ) {
    return { action: "IGNORED", reason: state.reason };
  }

  if (activeGoogleWatchRepairs.has(userId)) {
    return { action: "LOCKED", reason: "LOCKED" };
  }

  if (!options.force && (await isRepairCooldownActive(userId))) {
    return { action: "COOLDOWN", reason: "COOLDOWN" };
  }

  activeGoogleWatchRepairs.add(userId);

  try {
    await markRepairAttempt(userId);

    if (state.status === GoogleWatchStateStatus.REFRESH_REQUIRED) {
      return await refreshExpiringWatches(userId, state);
    }

    if (state.status === GoogleWatchStateStatus.REPAIR_REQUIRED) {
      return await recreateWatchesAndCatchUp(userId, state);
    }

    runFullRepairInBackground(userId);

    return { action: "FULL_REPAIR_STARTED", reason: state.reason };
  } finally {
    activeGoogleWatchRepairs.delete(userId);
  }
}

export const googleWatchRepairService = {
  ensureGoogleWatches,
};
