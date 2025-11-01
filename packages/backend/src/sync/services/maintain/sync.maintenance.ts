import { ObjectId } from "mongodb";
import { Logger } from "@core/logger/winston.logger";
import { Result_Watch_Stop } from "@core/types/sync.types";
import { Schema_Watch } from "@core/types/watch.types";
import dayjs from "@core/util/date/dayjs";
import compassAuthService from "@backend/auth/services/compass.auth.service";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import {
  isFullSyncRequired,
  isInvalidGoogleToken,
} from "@backend/common/services/gcal/gcal.utils";
import mongoService from "@backend/common/services/mongo.service";
import syncService from "@backend/sync/services/sync.service";
import { hasUpdatedCompassEventRecently } from "@backend/sync/util/sync.queries";
import { syncExpired, syncExpiresSoon } from "@backend/sync/util/sync.util";
import userService from "@backend/user/services/user.service";
import { zObjectId } from "../../../../../core/src/types/type.utils";

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

const getWatchesToRefresh = async (user: ObjectId) => {
  const watches = await mongoService.watch
    .find({ user: user.toString() })
    .toArray();

  const refresh: Schema_Watch[] = [];
  const active: Schema_Watch[] = [];
  const expired: Schema_Watch[] = [];

  watches.forEach((watch) => {
    const { expiration } = watch;
    const isExpired = syncExpired(expiration);
    const toRefresh = !isExpired && syncExpiresSoon(expiration);
    const isActive = !isExpired && !toRefresh;

    if (isExpired) expired.push(watch);
    else if (toRefresh) refresh.push(watch);
    else if (isActive) active.push(watch);
  });

  return { refresh, active, expired };
};

export const prepWatchMaintenanceForUser = async (
  user: ObjectId,
): Promise<Record<"prune" | "ignore" | "refresh", Schema_Watch[]>> => {
  const deadline = getActiveDeadline();
  const isUserActive = await hasUpdatedCompassEventRecently(user, deadline);
  const { active, expired, refresh } = await getWatchesToRefresh(user);

  return {
    refresh: isUserActive ? refresh : [],
    prune: expired.concat(isUserActive ? [] : [...active, ...refresh]),
    ignore: isUserActive ? active : [],
  };
};

export const pruneSync = async (
  records: Array<{ user: ObjectId; payload: Schema_Watch[] }>,
) => {
  const _prunes = records.map(async ({ user, payload }) => {
    let deletedUserData = false;
    let stopped: Result_Watch_Stop = [];

    const quotaUser = new ObjectId().toString();
    const gcal = await getGcalClient(user);

    try {
      const results = await Promise.all(
        payload.map(({ _id, resourceId }) =>
          syncService.stopWatch(
            user,
            _id.toString(),
            resourceId,
            gcal,
            quotaUser,
          ),
        ),
      );

      stopped = results.filter((r) => r !== undefined);
    } catch (e) {
      if (isInvalidGoogleToken(e as Error)) {
        await userService.deleteCompassDataForUser(user, false);
        deletedUserData = true;
      } else {
        logger.warn("Unexpected error during prune:", e);
        throw e;
      }
    }

    const { sessionsRevoked } = await compassAuthService.revokeSessionsByUser(
      user.toString(),
    );

    return { user, results: stopped, sessionsRevoked, deletedUserData };
  });

  const pruneResult = await Promise.all(_prunes);
  return pruneResult;
};

export const refreshWatch = async (
  toRefresh: {
    user: ObjectId;
    payload: Schema_Watch[];
  }[],
) => {
  const _refreshes = toRefresh.map(async (r) => {
    let revokedSession = false;
    let resynced = false;

    try {
      const gcal = await getGcalClient(r.user);

      const refreshesByUser = await Promise.all(
        r.payload.map(async ({ _id, user, expiration, ...syncPayload }) => {
          const _refresh = await syncService.refreshWatch(
            zObjectId.parse(user),
            {
              ...syncPayload,
              channelId: _id.toString(),
              expiration: expiration.getTime().toString(),
            },
            gcal,
          );

          return {
            gcalendarId: syncPayload.gCalendarId,
            success:
              _refresh?.acknowledged &&
              ObjectId.isValid(_refresh.insertedId ?? ""),
          };
        }),
      );

      return {
        user: r.user,
        results: refreshesByUser,
        resynced,
        revokedSession,
      };
    } catch (e) {
      if (isInvalidGoogleToken(e as Error)) {
        await compassAuthService.revokeSessionsByUser(r.user.toString());
        revokedSession = true;
      } else if (isFullSyncRequired(e as Error)) {
        userService.restartGoogleCalendarSync(r.user);
        resynced = true;
      } else {
        logger.error(
          `Unexpected error during refresh for user: ${r.user}:\n`,
          e,
        );
        throw e;
      }
      return { user: r.user, results: [], resynced, revokedSession };
    }
  });

  const refreshes = await Promise.all(_refreshes);
  return refreshes;
};
