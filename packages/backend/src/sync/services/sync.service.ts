import { GaxiosError } from "gaxios";
import { v4 as uuidv4 } from "uuid";
import { gCalendar } from "@core/types/gcal";
import {
  Payload_Sync_Notif,
  Payload_Sync_Events,
  Params_WatchEvents,
} from "@core/types/sync.types";
import { Logger } from "@core/logger/winston.logger";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import { Collections } from "@backend/common/constants/collections";
import {
  GenericError,
  SyncError,
} from "@backend/common/constants/error.constants";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";
import { error } from "@backend/common/errors/handlers/error.handler";
import { findCompassUserBy } from "@backend/user/queries/user.queries";

import {
  assembleEventImports,
  getCalendarInfo,
  importEvents,
  importEventsByCalendar,
  prepIncrementalImport,
  prepSyncMaintenance,
  prepSyncMaintenanceForUser,
  pruneSync,
  refreshSync,
} from "./sync.service.helpers";
import {
  deleteWatchData,
  getSync,
  isWatchingEventsByGcalId,
  updateSyncFor,
  updateRefreshedAtFor,
  updateSyncTokenFor,
} from "../util/sync.queries";
import { getChannelExpiration, isUsingHttps } from "../util/sync.utils";

const logger = Logger("app:sync.service");
class SyncService {
  deleteAllByGcalId = async (gCalendarId: string) => {
    const delRes = await mongoService.db
      .collection(Collections.SYNC)
      .deleteMany({ "google.events.gCalendarId": gCalendarId });
    return delRes;
  };

  deleteAllByUser = async (userId: string) => {
    const delRes = await mongoService.db
      .collection(Collections.SYNC)
      .deleteMany({ user: userId });
    return delRes;
  };

  deleteByIntegration = async (integration: "google", userId: string) => {
    const response = await mongoService.db
      .collection(Collections.SYNC)
      .updateOne({ user: userId }, { $unset: { [integration]: "" } });

    return response;
  };

  handleGcalNotification = async (payload: Payload_Sync_Notif) => {
    const { channelId, expiration, resourceId, resourceState } = payload;
    if (resourceState !== "exists") {
      logger.info(`Sync initialized for channelId: ${channelId}`);
      return "initialized";
    }

    const sync = await getSync({ resourceId });
    if (!sync) {
      logger.debug(
        `Ignored notification becasuse no sync for this resourceId: ${resourceId}`
      );
      return "ignored";
    }

    const { userId, gCalendarId, nextSyncToken } = getCalendarInfo(
      sync,
      resourceId
    );

    const syncInfo = {
      channelId,
      expiration,
      gCalendarId,
      nextSyncToken,
      resourceId,
    };

    const response = await importEventsByCalendar(userId, syncInfo);
    return response;
  };

  importFull = async (
    gcal: gCalendar,
    gCalendarIds: string[],
    userId: string
  ) => {
    const eventImports = gCalendarIds.map(async (gCalId) => {
      const { nextSyncToken } = await importEvents(userId, gcal, gCalId);
      if (isUsingHttps()) {
        await updateSyncTokenFor("events", userId, nextSyncToken, gCalId);
      } else {
        logger.warn(
          `Skipped updating sync token for user: ${userId} and gCalId: ${gCalId} because not using https`
        );
      }
    });

    await Promise.all(eventImports);
  };

  importIncremental = async (userId: string, gcal?: gCalendar) => {
    if (!gcal) gcal = await getGcalClient(userId);

    const eventSyncPayloads = await prepIncrementalImport(userId, gcal);

    const importEvents = assembleEventImports(userId, gcal, eventSyncPayloads);

    const result = await Promise.all(importEvents);

    return result;
  };

  refreshWatch = async (
    userId: string,
    payload: Payload_Sync_Events,
    gcal?: gCalendar
  ) => {
    if (!gcal) gcal = await getGcalClient(userId);

    const watchExists = payload.channelId && payload.resourceId;
    if (watchExists) {
      await this.stopWatch(userId, payload.channelId, payload.resourceId, gcal);
    }

    const watchResult = await this.startWatchingGcalEvents(
      userId,
      {
        gCalendarId: payload.gCalendarId,
        nextSyncToken: payload.nextSyncToken,
      },
      gcal
    );

    await updateRefreshedAtFor("events", userId, payload.gCalendarId);

    return watchResult;
  };

  runMaintenance = async () => {
    const { ignored, toPrune, toRefresh } = await prepSyncMaintenance();

    const pruneResult = await pruneSync(toPrune);
    const pruned = pruneResult.filter((p) => !p.deletedUserData);
    const deletedDuringPrune = pruneResult.filter((p) => p.deletedUserData);

    const refreshResult = await refreshSync(toRefresh);
    const refreshed = refreshResult.filter((r) => !r.revokedSession);
    const revokedSession = refreshResult.filter((r) => r.revokedSession);
    const resynced = refreshResult.filter((r) => r.resynced);

    logger.debug(`Sync Maintenance Results:
      IGNORED: ${ignored.length} 
      PRUNED: ${pruned.map((p) => p.user).toString()}
      REFRESHED: ${refreshed.map((r) => r.user).toString()}

      DELETED DURING PRUNE: ${deletedDuringPrune.map((r) => r.user).toString()}
      REVOKED SESSION DURING REFRESH: ${revokedSession
        .map((r) => r.user)
        .toString()}
      RESYNCED DURING REFRESH: ${resynced.map((r) => r.user).toString()}
    `);

    return {
      ignored: ignored.length,
      pruned: pruned.length,
      refreshed: refreshed.length,
      revoked: revokedSession.length,
      deleted: deletedDuringPrune.length,
    };
  };

  runMaintenanceByUser = async (userId: string, params: { dry: boolean }) => {
    const user = await findCompassUserBy("_id", userId);
    const _result = await prepSyncMaintenanceForUser(userId);
    const result = { ..._result, user: user?.email || "Not found" };

    if (params.dry) {
      return result;
    }

    switch (result.action) {
      case "ignore": {
        return result;
      }
      case "prune": {
        const pruneResult = await pruneSync([userId]);
        return { ...result, result: pruneResult };
      }
      case "refresh": {
        if (!result.payload) {
          return {
            ...result,
            result: { error: "Didn't refresh because payloads not included" },
          };
        }
        const refreshResult = await refreshSync([
          { userId, payloads: result.payload },
        ]);
        return { ...result, result: refreshResult };
      }
      default: {
        return { ...result, error: "No maintenance action" };
      }
    }
  };

  startWatchingGcalEvents = async (
    userId: string,
    params: { gCalendarId: string; nextSyncToken?: string },
    gcal?: gCalendar
  ) => {
    if (!gcal) gcal = await getGcalClient(userId);

    const alreadyWatching = await isWatchingEventsByGcalId(
      userId,
      params.gCalendarId
    );
    if (alreadyWatching) {
      throw error(SyncError.CalendarWatchExists, "Skipped Start Watch");
    }

    const channelId = uuidv4();
    const expiration = getChannelExpiration();
    let watchParams: Params_WatchEvents = {
      gCalendarId: params.gCalendarId,
      channelId: channelId,
      expiration,
    };

    if (params.nextSyncToken) {
      watchParams = { ...watchParams, nextSyncToken: params.nextSyncToken };
    }

    const { watch } = await gcalService.watchEvents(gcal, watchParams);
    const { resourceId } = watch;

    if (!resourceId) {
      throw error(SyncError.NoResourceId, "Calendar Watch Failed");
    }

    const sync = await updateSyncFor("events", userId, {
      gCalendarId: params.gCalendarId,
      channelId,
      resourceId,
      expiration,
      nextSyncToken: params.nextSyncToken,
    });

    return sync;
  };

  startWatchingGcalEventsById = async (
    userId: string,
    watchParams: { gCalId: string; nextSyncToken?: string }[],
    gcal: gCalendar
  ) => {
    const eventWatches = watchParams.map(async (gInfo) => {
      await this.startWatchingGcalEvents(
        userId,
        { gCalendarId: gInfo.gCalId, nextSyncToken: gInfo.nextSyncToken },
        gcal
      );
      await updateRefreshedAtFor("events", userId, gInfo.gCalId);
    });

    await Promise.all(eventWatches);
  };

  stopWatch = async (
    userId: string,
    channelId: string,
    resourceId: string,
    gcal?: gCalendar
  ) => {
    if (!gcal) gcal = await getGcalClient(userId);

    const params = {
      requestBody: {
        id: channelId,
        resourceId: resourceId,
      },
    };

    try {
      const stopResult = await gcal.channels.stop(params);
      if (stopResult.status !== 204) {
        throw error(GenericError.NotSure, "Stop Failed");
      }

      await deleteWatchData(userId, "events", channelId);

      return {
        channelId: channelId,
        resourceId: resourceId,
      };
    } catch (e) {
      const _e = e as GaxiosError;
      const code = (_e.code as unknown as number) || 0;

      if (_e.code === "404" || code === 404) {
        await deleteWatchData(userId, "events", channelId);
        logger.warn(
          "Channel no longer exists. Corresponding sync record deleted"
        );
        return {};
      }

      throw e;
    }
  };

  stopWatches = async (userId: string) => {
    const sync = await getSync({ userId });

    if (!sync || !sync.google.events) {
      return [];
    }

    logger.debug(`Stopping all gcal event watches for user: ${userId}`);

    const gcal = await getGcalClient(userId);

    const stopped = [];
    for (const es of sync.google.events) {
      if (!es.channelId || !es.resourceId) {
        logger.debug(
          `Skipped stop for calendarId: ${es.gCalendarId} due to missing field(s):
            channelId: ${es.channelId}
            resourceid: ${es.resourceId}`
        );
        continue;
      }

      await this.stopWatch(userId, es.channelId, es.resourceId, gcal);

      stopped.push({
        channelId: es.channelId,
        resourceId: es.resourceId,
      });
    }

    return stopped;
  };
}

export default new SyncService();
