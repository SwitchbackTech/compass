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
  deleteAllSyncData,
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
    if (payload.resourceState !== "exists") {
      logger.info("sync initialized");
      return "initialized";
    }

    logger.debug(JSON.stringify(payload, null, 2));

    const { userId, gCalendarId, nextSyncToken } = await getCalendarInfo(
      payload.resourceId
    );

    const syncInfo = {
      channelId: payload.channelId,
      expiration: payload.expiration,
      gCalendarId,
      nextSyncToken,
      resourceId: payload.resourceId,
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

      const msg = "Stop Ignored, Sync Deleted";

      const noAccess = isAccessRevoked(_e);
      if (noAccess) {
        logger.warn("Access revoked, cleaning data ...");
        await deleteAllSyncData(userId);
        throw error(SyncError.AccessRevoked, msg);
      }

      if (_e.code === "404" || code === 404) {
        await deleteWatchData(userId, "events", channelId);
        throw error(SyncError.ChannelDoesNotExist, msg);
      }

      logger.error(e);
      throw error(GenericError.NotSure, "Stop Failed");
    }
  };

  stopWatches = async (userId: string) => {
    const sync = await getSync({ userId });

    if (!sync || !sync.google.events) {
      // throw error(SyncError.NoWatchesForUser, "Ignored Stop Request");
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

/* //--
OLDhandleGcalNotification = async (payload: Payload_Sync_Notif) => {
    try {
      const result = {
        params: undefined,
        init: undefined,
        watch: undefined,
        prep: undefined,
        events: undefined,
      };

      // There is new data to sync from GCal //
      if (payload.resourceState === "exists") {
        const { channelPrepResult, userId, gcal, nextSyncToken } =
          await OLDprepareSyncChannels(payload);

        result.watch = channelPrepResult;

        const params: Params_Sync_Gcal = {
          ...payload,
          userId: userId,
          nextSyncToken,
          // TODO use non-hard-coded calendarId once supporting non-'primary' calendars
          calendarId: GCAL_PRIMARY,
        };
        result.params = params;

        const prepResult = await OLDprepareUpdate(gcal, params);
        result.prep = prepResult;

        if (prepResult.operations.length > 0)
          result.events = await mongoService.db
            .collection(Collections.EVENT)
            .bulkWrite(prepResult.operations);
      }

      // syncFileLogger.debug(JSON.stringify(result, null, 2));
      syncFileLogger.debug(result);
      return result;
    } catch (e) {
      logger.error(e);
      syncFileLogger.error(e);
      return new BaseError("Sync Failed", e, Status.INTERNAL_SERVER, false);
    }
  };

  updateNextSyncToken = async (userId: string, nextSyncToken: string) => {
    const msg = `Failed to update the nextSyncToken for calendar record of user: ${userId}`;
    const err = new BaseError("Update Failed", msg, 500, true);

    try {
      // updates the primary calendar's nextSyncToken
      // query will need to be updated once supporting non-primary calendars
      const result = await mongoService.db
        .collection(Collections.CALENDARLIST)
        .findOneAndUpdate(
          { user: userId, "google.items.primary": true },
          {
            $set: {
              "google.items.$.sync.nextSyncToken": nextSyncToken,
              updatedAt: new Date(),
            },
          },
          { returnDocument: "after" }
        );

      if (result.value !== null) {
        return { status: `updated to: ${nextSyncToken}` };
      } else {
        logger.error(msg);
        return { status: "Failed to update properly", debugResult: result };
      }
    } catch (e) {
      logger.error(e);
      throw err;
    }
  };
  */
