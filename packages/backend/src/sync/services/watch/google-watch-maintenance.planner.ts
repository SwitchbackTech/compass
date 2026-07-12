import { Logger } from "@core/logger/winston.logger";
import { type Result_Watch_Stop } from "@core/types/sync.types";
import { type Schema_Watch } from "@core/types/watch.types";
import dayjs from "@core/util/date/dayjs";
import { createGoogleRequestContext } from "@backend/common/services/gcal/gcal.context";
import { isInvalidGoogleToken } from "@backend/common/services/gcal/gcal.utils";
import mongoService from "@backend/common/services/mongo.service";
import { pruneGoogleDataAndNotifyRevoked } from "@backend/sync/services/google-sync/google-sync.revoked";
import { googleWatchService } from "@backend/sync/services/watch/google-watch.service";
import { hasUserBeenActiveSince } from "@backend/sync/services/watch/google-watch-activity";
import {
  syncExpired,
  syncExpiresSoon,
} from "@backend/sync/services/watch/google-watch-timing";

const logger = Logger("app:google-watch-maintenance.planner");

const getActiveDeadline = () => {
  const deadlineDays = 14;
  const deadline = dayjs()
    .hour(0)
    .minute(0)
    .subtract(deadlineDays, "days")
    .format();

  return deadline;
};

const getWatchesToRefresh = async (user: string) => {
  const watches = await mongoService.watch.find({ user }).toArray();
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
  userId: string,
): Promise<{
  prune: Schema_Watch[];
  ignore: Schema_Watch[];
  refresh: Schema_Watch[];
  isActive: boolean;
}> => {
  const deadline = getActiveDeadline();
  const isUserActive = await hasUserBeenActiveSince(userId, deadline);
  const { active, expired, refresh } = await getWatchesToRefresh(userId);

  return {
    refresh: isUserActive ? refresh : [],
    prune: expired.concat(isUserActive ? [] : [...active, ...refresh]),
    ignore: isUserActive ? active : [],
    isActive: isUserActive,
  };
};

export const pruneSync = async (
  records: Array<{ user: string; payload: Schema_Watch[] }>,
) => {
  const _prunes = records.map(async ({ user, payload }) => {
    let prunedGoogleData = false;
    let stopped: Result_Watch_Stop = [];

    const context = await createGoogleRequestContext(user);

    try {
      const results = await Promise.all(
        payload.map(({ _id, resourceId }) =>
          googleWatchService.stopWatch(
            user,
            _id.toString(),
            resourceId,
            context,
          ),
        ),
      );

      stopped = results.filter(
        (r): r is { channelId: string; resourceId: string } => r !== undefined,
      );
    } catch (e) {
      if (isInvalidGoogleToken(e as Error)) {
        // A29: prune Google-owned data (archives google calendars, deletes
        // google events, clears watches/sync/refresh token) and preserve
        // everything Compass-local - never deleteCompassDataForUser, which
        // wipes the whole account including local-only data.
        await pruneGoogleDataAndNotifyRevoked(user, "watch maintenance");
        prunedGoogleData = true;
      } else {
        logger.warn("Unexpected error during prune:", e);
        throw e;
      }
    }

    return { user, results: stopped, prunedGoogleData };
  });

  const pruneResult = await Promise.all(_prunes);
  return pruneResult;
};
