import { GaxiosError } from "gaxios";
import { v4 as uuidv4 } from "uuid";
import { gCalendar } from "@core/types/gcal";
import {
  Payload_Sync_Notif,
  Payload_Sync_Events,
  Params_WatchEvents,
} from "@core/types/sync.types";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import { Logger } from "@core/logger/winston.logger";
import { Collections } from "@backend/common/constants/collections";
import {
  error,
  GenericError,
  SyncError,
} from "@backend/common/errors/types/backend.errors";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";

import {
  assembleEventImports,
  getCalendarInfo,
  importEvents,
  importEventsByCalendar,
  prepIncrementalImport,
  prepSyncMaintenance,
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
} from "./sync.queries";
import { getChannelExpiration } from "./sync.utils";

const logger = Logger("app:sync.service");
class SyncService {
  deleteAllByGcalendarId = async (gCalendarId: string) => {
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

  handleGcalNotification = async (payload: Payload_Sync_Notif) => {
    const { channelId, expiration, resourceId, resourceState } = payload;
    if (resourceState !== "exists") {
      logger.info(`sync initialized for channelId: ${channelId}`);
      return "initialized";
    }

    const sync = await getSync({ resourceId });
    if (!sync) {
      logger.debug(
        `Ignored notification becasuse no sync for this resourceId: ${resourceId}`
      );
      return "ignored";
    }

    logger.debug(JSON.stringify(payload, null, 2));
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
      await updateSyncTokenFor("events", userId, nextSyncToken, gCalId);
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

    const watchResult = await this.watchGcalEvents(
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

  runSyncMaintenance = async () => {
    const { ignored, toPrune, toRefresh } = await prepSyncMaintenance();

    const pruneResult = await pruneSync(toPrune);
    const pruned = pruneResult.filter((p) => !p.deletedUserData);
    const deletedDuringPrune = pruneResult.filter((p) => p.deletedUserData);

    const refreshResult = await refreshSync(toRefresh);
    const refreshed = refreshResult.filter((r) => !r.deletedUserData);
    const deletedDuringRefresh = refreshResult.filter((r) => r.deletedUserData);

    logger.debug(`Sync Maintenance Results:
      ignored: ${ignored.toString()} 
      pruned: ${pruned.map((p) => p.user).toString()}
      refreshed: ${refreshed.map((r) => r.user).toString()}

      deletedDuringPrune: ${deletedDuringPrune.map((r) => r.user).toString()}
      deletedDuringRefresh: ${deletedDuringRefresh
        .map((r) => r.user)
        .toString()}
    `);

    return {
      ignored: ignored.length,
      pruned: pruned.length,
      refreshed: refreshed.length,
      deleted: deletedDuringPrune.length + deletedDuringRefresh.length,
    };
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

  watchGcalEvents = async (
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

  watchGcalEventsById = async (
    userId: string,
    watchParams: { gCalId: string; nextSyncToken?: string }[],
    gcal: gCalendar
  ) => {
    const eventWatches = watchParams.map(async (gInfo) => {
      await this.watchGcalEvents(
        userId,
        { gCalendarId: gInfo.gCalId, nextSyncToken: gInfo.nextSyncToken },
        gcal
      );
      await updateRefreshedAtFor("events", userId, gInfo.gCalId);
    });

    await Promise.all(eventWatches);
  };
}

export default new SyncService();
