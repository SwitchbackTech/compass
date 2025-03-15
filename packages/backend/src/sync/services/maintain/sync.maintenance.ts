import dayjs from "dayjs";
import { Logger } from "@core/logger/winston.logger";
import {
  Payload_Sync_Events,
  Payload_Sync_Refresh,
  Result_Watch_Stop,
  Schema_Sync,
} from "@core/types/sync.types";
import compassAuthService from "@backend/auth/services/compass.auth.service";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import {
  isFullSyncRequired,
  isInvalidGoogleToken,
} from "@backend/common/services/gcal/gcal.utils";
import mongoService from "@backend/common/services/mongo.service";
import {
  getSync,
  hasUpdatedCompassEventRecently,
} from "@backend/sync/util/sync.queries";
import {
  hasAnyActiveEventSync,
  syncExpired,
  syncExpiresSoon,
} from "@backend/sync/util/sync.util";
import userService from "@backend/user/services/user.service";
import syncService from "../sync.service";

const logger = Logger("app:sync.maintenance");

const getActiveDeadline = () => {
  const deadlineDays = 14;
  const deadline = dayjs()
    .hour(0)
    .minute(0)
    .subtract(deadlineDays, "days")
    .format();

  return deadline;
};

const getSyncsToRefresh = (sync: Schema_Sync) => {
  const syncsToRefresh: Payload_Sync_Events[] = [];

  sync.google.events.map((s) => {
    const expiry = s.expiration;

    if (!syncExpired(expiry) && syncExpiresSoon(expiry)) {
      syncsToRefresh.push(s);
    }
  });

  return syncsToRefresh;
};
export const prepSyncMaintenance = async () => {
  const toRefresh = [];
  const toPrune = [];
  const ignored = [];

  const deadline = getActiveDeadline();

  const cursor = mongoService.user.find();
  while (await cursor.hasNext()) {
    const user = await cursor.next();
    const userId = user?._id.toString() as string;

    const sync = await getSync({ userId });
    if (!sync) {
      ignored.push(userId);
      continue;
    }

    const isUserActive = await hasUpdatedCompassEventRecently(userId, deadline);
    if (isUserActive) {
      const syncsToRefresh = getSyncsToRefresh(sync);

      if (syncsToRefresh.length > 0) {
        toRefresh.push({ userId, payloads: syncsToRefresh });
      } else {
        ignored.push(userId);
      }
    } else {
      if (hasAnyActiveEventSync(sync)) {
        toPrune.push(sync.user);
      } else {
        ignored.push(userId);
      }
    }
  }

  return {
    ignored,
    toPrune,
    toRefresh,
  };
};

export const prepSyncMaintenanceForUser = async (userId: string) => {
  const sync = await getSync({ userId });
  if (!sync) {
    return { action: "ignore", reason: "no sync" };
  }

  const deadline = getActiveDeadline();
  const isUserActive = await hasUpdatedCompassEventRecently(userId, deadline);
  if (isUserActive) {
    const syncsToRefresh = getSyncsToRefresh(sync);

    if (syncsToRefresh.length > 0) {
      return {
        action: "refresh",
        reason: "Active user + expiring soon",
        payload: syncsToRefresh,
      };
    } else {
      return {
        action: "ignore",
        reason: "Active user + not expired/expiring soon",
      };
    }
  } else {
    const result = hasAnyActiveEventSync(sync)
      ? { action: "prune", reason: "Inactive user + active sync" }
      : { action: "ignore", reason: "Inactive user + no active syncs" };
    return result;
  }
};

export const pruneSync = async (toPrune: string[]) => {
  const _prunes = toPrune.map(async (u) => {
    let deletedUserData = false;
    let stopped: Result_Watch_Stop = [];
    try {
      stopped = await syncService.stopWatches(u);
    } catch (e) {
      if (isInvalidGoogleToken(e as Error)) {
        await userService.deleteCompassDataForUser(u, false);
        deletedUserData = true;
      } else {
        logger.warn("Unexpected error during prune:", e);
        throw e;
      }
    }

    const { sessionsRevoked } =
      await compassAuthService.revokeSessionsByUser(u);

    return { user: u, results: stopped, sessionsRevoked, deletedUserData };
  });

  const pruneResult = await Promise.all(_prunes);
  return pruneResult;
};

export const refreshSync = async (toRefresh: Payload_Sync_Refresh[]) => {
  const _refreshes = toRefresh.map(async (r) => {
    let revokedSession = false;
    let resynced = false;

    try {
      const gcal = await getGcalClient(r.userId);

      const refreshesByUser = r.payloads.map(async (syncPayload) => {
        const _refresh = await syncService.refreshWatch(
          r.userId,
          syncPayload,
          gcal,
        );
        return {
          gcalendarId: syncPayload.gCalendarId,
          success: _refresh.acknowledged && _refresh.modifiedCount === 1,
        };
      });

      const refreshes = await Promise.all(refreshesByUser);
      return { user: r.userId, results: refreshes, resynced, revokedSession };
    } catch (e) {
      if (isInvalidGoogleToken(e as Error)) {
        await compassAuthService.revokeSessionsByUser(r.userId);
        revokedSession = true;
      } else if (isFullSyncRequired(e as Error)) {
        await userService.reSyncGoogleData(r.userId);
        resynced = true;
      } else {
        logger.error(
          `Unexpected error during refresh for user: ${r.userId}:\n`,
          e,
        );
        throw e;
      }
      return { user: r.userId, results: [], resynced, revokedSession };
    }
  });

  const refreshes = await Promise.all(_refreshes);
  return refreshes;
};
