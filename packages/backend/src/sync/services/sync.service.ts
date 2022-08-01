import { GaxiosError } from "gaxios";
import { v4 as uuidv4 } from "uuid";
import { gCalendar } from "@core/types/gcal";
import {
  Params_Sync_Gcal,
  Payload_Sync_Notif,
  Resource_Sync,
  Payload_Resource_Events,
  Schema_Sync,
  Payload_Sync_Events,
} from "@core/types/sync.types";
import { BaseError } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import { Logger } from "@core/logger/winston.logger";
import { GCAL_PRIMARY } from "@backend/common/constants/backend.constants";
import { Collections } from "@backend/common/constants/collections";
import {
  error,
  GenericError,
  SyncError,
} from "@backend/common/errors/types/backend.errors";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";
import { getCalendarsToSync } from "@backend/auth/services/auth.utils";

import {
  isWatchingEvents,
  assembleEventImports,
  OLDprepareSyncChannels,
  OLDprepareUpdate,
  importEvents,
  deleteSync,
  prepareEventSyncChannels,
  startWatchingGcalsById,
} from "./sync.service.helpers";
import { getChannelExpiration } from "./sync.utils";

const logger = Logger("app:sync.service");
// separate logger to keep main less noisy
const syncFileLogger = Logger("app:sync.gcal", "logs/sync.gcal.log");

class SyncService {
  deleteAllByUser = async (userId: string) => {
    const delRes = await mongoService.db
      .collection(Collections.SYNC)
      .deleteMany({ user: userId });
    return delRes;
  };

  handleGcalNotification = async (payload: Payload_Sync_Notif) => {
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

  importFull = async (
    gcal: gCalendar,
    gCalendarIds: string[],
    userId: string
  ) => {
    const eventImports = gCalendarIds.map(async (gCalId) => {
      const { nextSyncToken } = await importEvents(userId, gcal, gCalId);
      await this.updateEventsSyncToken(userId, gCalId, nextSyncToken);
    });

    await Promise.all(eventImports);
  };

  importIncremental = async (userId: string, gcal?: gCalendar) => {
    if (!gcal) gcal = await getGcalClient(userId);

    const sync = await prepareEventSyncChannels(userId, gcal);

    const importEvents = assembleEventImports(userId, gcal, sync.google.events);

    const result = await Promise.all(importEvents);
    return result;
  };

  startWatchingGcal = async (
    userId: string,
    gCalendarId: string,
    gcal?: gCalendar
  ) => {
    const channelId = uuidv4();
    if (!gcal) gcal = await getGcalClient(userId);

    const alreadyWatching = await isWatchingEvents(userId, gCalendarId);
    if (alreadyWatching) {
      throw error(SyncError.CalendarWatchExists, "Skipped Start Watch");
    }

    logger.debug(
      `Setting up event watch for:\n\tgCalendarId: '${gCalendarId}'\n\tchannelId: '${channelId}'\n\tuser: ${userId}`
    );

    const expiration = getChannelExpiration();
    const { watch } = await gcalService.watchEvents(
      gcal,
      gCalendarId,
      channelId,
      expiration
    );

    const { resourceId } = watch;
    if (!resourceId) {
      throw error(SyncError.MissingResourceId, "Calendar Watch Failed");
    }

    const sync = await this.updateSyncData(userId, "events", {
      gCalendarId,
      channelId,
      resourceId,
      expiration,
    });

    return sync;
  };

  startWatchingGcals = async (userId: string, gcal: gCalendar) => {
    const { gCalendarIds, nextSyncToken } = await getCalendarsToSync(
      userId,
      gcal
    );
    await this.updateSyncToken(userId, "calendarlist", nextSyncToken);

    await startWatchingGcalsById(userId, gCalendarIds, gcal);
  };

  stopAllGcalEventWatches = async (userId: string) => {
    logger.debug(`Stopping all gcal event watches for user: ${userId}`);

    const sync = (await mongoService.db
      .collection(Collections.SYNC)
      .findOne({ user: userId })) as unknown as Schema_Sync;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!sync || !sync.google.events) {
      throw error(SyncError.NoWatchesForUser, "Ignored Stop Request");
    }

    const gcal = await getGcalClient(userId);

    for (const es of sync.google.events) {
      await this.stopWatch(userId, es.channelId, es.resourceId, gcal);
    }

    const watchStopSummary = {
      watchStopCount: sync.google.events.length,
    };
    return watchStopSummary;
  };

  stopWatch = async (
    userId: string,
    channelId: string,
    resourceId: string,
    gcal?: gCalendar
  ) => {
    if (!gcal) gcal = await getGcalClient(userId);

    logger.debug(
      `Stopping watch for channelId: ${channelId} and resourceId: ${resourceId}`
    );
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
      await deleteSync(userId, "events", channelId);

      return {
        channelId: channelId,
        resourceId: resourceId,
      };
    } catch (e) {
      logger.error(e);

      const _e = e as GaxiosError;

      if (_e.code === "404" || e.code === 404) {
        await deleteSync(userId, "events", channelId);

        throw error(
          SyncError.ChannelDoesNotExist,
          "Stop Ignored, Sync Deleted"
        );
      }
      throw error(GenericError.NotSure, "Stop Failed");
    }
  };

  refreshChannelWatch = async (
    userId: string,
    gcal: gCalendar,
    payload: Payload_Sync_Events
  ) => {
    const stopResult = await this.stopWatch(
      userId,
      payload.channelId,
      payload.resourceId,
      gcal
    );

    const startResult = await this.startWatchingGcal(
      userId,
      payload.gCalendarId,
      gcal
    );

    const refreshResult = {
      stop: stopResult,
      start: startResult,
      // syncUpdate: syncUpdate.ok === 1 ? "success" : "failed",
    };
    return refreshResult;
  };

  updateEventsSyncToken = async (
    userId: string,
    gCalendarId: string,
    nextSyncToken: string
  ) => {
    const response = await mongoService.db
      .collection(Collections.SYNC)
      .findOneAndUpdate(
        { user: userId, "google.events.gCalendarId": gCalendarId },
        {
          $set: {
            "google.events.$.nextSyncToken": nextSyncToken,
            "google.events.$.lastSyncedAt": new Date(),
          },
        },
        { upsert: true }
      );

    return response;
  };

  updateSyncToken = async (
    userId: string,
    resource: Resource_Sync,
    nextSyncToken: string
  ) => {
    const result = await mongoService.db
      .collection(Collections.SYNC)
      .findOneAndUpdate(
        {
          user: userId,
        },
        {
          $set: {
            [`google.${resource}.nextSyncToken`]: nextSyncToken,
            [`google.${resource}.lastSyncedAt`]: new Date(),
          },
        },
        { returnDocument: "after", upsert: true }
      );

    return result;
  };

  //__ replace with above
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

  updateSyncData = async (
    userId: string,
    resource: Resource_Sync,
    data: Payload_Resource_Events
  ) => {
    if (resource !== "events") {
      throw error(GenericError.NotImplemented, "Sync Update Failed");
    }

    await mongoService.db.collection(Collections.SYNC).updateOne(
      { user: userId },
      {
        $push: {
          "google.events": {
            gCalendarId: data.gCalendarId,
            channelId: data.channelId,
            expiration: data.expiration,
            resourceId: data.resourceId,
            lastSyncedAt: new Date(),
          },
        },
      },
      { upsert: true }
    );

    const updatedSync = (await mongoService.db
      .collection(Collections.SYNC)
      .findOne({ user: userId })) as Schema_Sync | null;
    if (!updatedSync) {
      throw error(SyncError.NoSyncRecordForUser, "Failed to Update Sync Data");
    }

    return updatedSync;
  };
}

export default new SyncService();
