import { GaxiosError } from "gaxios";
import { v4 as uuidv4 } from "uuid";
import { gCalendar } from "@core/types/gcal";
import {
  Payload_Sync_Notif,
  Payload_Sync_Events,
} from "@core/types/sync.types";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import { Logger } from "@core/logger/winston.logger";
import { Collections } from "@backend/common/constants/collections";
import {
  error,
  GenericError,
  SyncError,
} from "@backend/common/errors/types/backend.errors";
import { getCalendarsToSync } from "@backend/auth/services/auth.utils";
import { isAccessRevoked } from "@backend/common/services/gcal/gcal.utils";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";

import {
  assembleEventImports,
  getCalendarInfo,
  importEvents,
  importEventsByCalendar,
  prepEventSyncChannels,
  startWatchingGcalsById,
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

    const sync = await prepEventSyncChannels(userId, gcal);

    const importEvents = assembleEventImports(userId, gcal, sync.google.events);

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

    const watchResult = await this.startWatchingGcal(
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

    const prunes = await pruneSync(toPrune);
    const refreshes = await refreshSync(toRefresh);

    logger.debug(`Sync results:
      ignored: ${ignored.toString()} 
      pruned: ${prunes.map((p) => p.user).toString()}
      refreshed: ${refreshes.map((r) => r.user).toString()}
    `);

    return {
      ignored: ignored.length,
      pruned: prunes.length,
      refreshed: refreshes.length,
    };
  };

  startWatchingGcal = async (
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
    const watchParams = {
      gCalendarId: params.gCalendarId,
      channelId: channelId,
      expiration,
      nextSyncToken: params.nextSyncToken,
    };

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

  startWatchingGcals = async (userId: string, gcal: gCalendar) => {
    const { gCalendarIds, nextSyncToken } = await getCalendarsToSync(
      userId,
      gcal
    );

    await updateSyncTokenFor("calendarlist", userId, nextSyncToken);

    await startWatchingGcalsById(userId, gCalendarIds, gcal);
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
