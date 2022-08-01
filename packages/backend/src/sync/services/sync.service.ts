import { GaxiosError } from "gaxios";
import { v4 as uuidv4 } from "uuid";
import { gCalendar } from "@core/types/gcal";
import { Schema_CalendarList } from "@core/types/calendar.types";
import {
  Params_Sync_Gcal,
  Request_Sync_Gcal,
  Resource_Sync,
  Result_Sync_Prep_Gcal,
  Payload_Resource_Events,
  Schema_Sync,
} from "@core/types/sync.types";
import { BaseError } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import { Logger } from "@core/logger/winston.logger";
import { GCAL_PRIMARY } from "@backend/common/constants/backend.constants";
import { Collections } from "@backend/common/constants/collections";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";
import {
  error,
  GenericError,
  SyncError,
} from "@backend/common/errors/types/backend.errors";

import {
  assembleBulkOperations,
  categorizeGcalEvents,
  channelRefreshNeeded,
  findCalendarByResourceId,
  getChannelExpiration,
  getSummary,
} from "./sync.utils";

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

  handleGcalNotification = async (reqParams: Request_Sync_Gcal) => {
    try {
      const result = {
        params: undefined,
        init: undefined,
        watch: undefined,
        prep: undefined,
        events: undefined,
      };

      // if (reqParams.resourceState === "sync") {}

      // There is new data to sync from GCal //
      if (reqParams.resourceState === "exists") {
        const { channelPrepResult, userId, gcal, nextSyncToken } =
          await this.prepareSyncChannels(reqParams);

        result.watch = channelPrepResult;

        const params: Params_Sync_Gcal = {
          ...reqParams,
          userId: userId,
          nextSyncToken: nextSyncToken,
          // TODO use non-hard-coded calendarId once supporting non-'primary' calendars
          calendarId: GCAL_PRIMARY,
        };
        result.params = params;

        const prepResult = await this.prepareUpdate(gcal, params);
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

  startWatchingEvents = async (
    gcal: gCalendar,
    userId: string,
    gCalendarId: string,
    channelId?: string
  ) => {
    if (!channelId) channelId = uuidv4();

    logger.info(
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

    const syncUpdate = await this.updateSyncData(userId, "events", {
      gCalendarId,
      channelId,
      resourceId,
      expiration,
    });

    return syncUpdate;
  };

  stopAllGcalEventWatches = async (userId: string) => {
    logger.info(`Stopping all gcal event watches for user: ${userId}`);

    const sync = (await mongoService.db
      .collection(Collections.SYNC)
      .findOne({ user: userId })) as unknown as Schema_Sync;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!sync || !sync.google.events) {
      throw error(SyncError.NoWatchesForUser, "Stop Request Aborted");
    }

    const gcal = await getGcalClient(userId);

    for (const es of sync.google.events) {
      try {
        await this.stopWatch(gcal, es.channelId, es.resourceId);
      } catch (e: unknown | BaseError) {
        if (e instanceof BaseError && e.statusCode === Status.NOT_FOUND) {
          // throw e;
        }
      } finally {
        await mongoService.db
          .collection(Collections.SYNC)
          .deleteOne({ userId, channelId: es.channelId });
      }
    }

    const watchStopSummary = {
      summary: "success",
      watchStopCount: sync.google.events.length,
    };
    return watchStopSummary;
  };

  stopWatch = async (
    gcal: gCalendar,
    channelId: string,
    resourceId: string
  ) => {
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

      if (stopResult.status === 204) {
        return {
          result: "success",
          channelId: channelId,
          resourceId: resourceId,
        };
      }
      return { error: stopResult };
    } catch (e) {
      const _e = e as GaxiosError;
      if (_e.code === "404") {
        return error(SyncError.ChannelDoesNotExist, "Stop Ignored + Deleted");
      }
      return { error: e };
    }
  };

  prepareSyncChannels = async (reqParams: Request_Sync_Gcal) => {
    const channelPrepResult = {
      stop: undefined,
      refresh: undefined,
      stillActive: undefined,
    };

    // initialize what you'll need later
    const calendarList = (await mongoService.db
      .collection(Collections.CALENDARLIST)
      .findOne({
        "google.items.sync.resourceId": reqParams.resourceId,
      })) as Schema_CalendarList;

    const userId = calendarList.user;

    const cal = findCalendarByResourceId(reqParams.resourceId, calendarList);
    const nextSyncToken = cal.sync.nextSyncToken;

    const gcal = await getGcalClient(userId);

    const refreshNeeded = channelRefreshNeeded(reqParams, calendarList);
    if (refreshNeeded) {
      console.log("\n**** (this used to be when you refreshed channel) ***\n");
      //--++
      // channelPrepResult.refresh = await this.refreshChannelWatch(
      //   userId,
      //   gcal,
      //   reqParams
      // );
    } else {
      channelPrepResult.stillActive = true;
    }

    return { channelPrepResult, userId, gcal, nextSyncToken };
  };

  prepareUpdate = async (
    gcal: gCalendar,
    params: Params_Sync_Gcal
  ): Promise<Result_Sync_Prep_Gcal> => {
    const prepResult = {
      syncToken: undefined,
      operations: undefined,
      errors: [],
    };

    try {
      // TODO: support pageToken in case a lot of new events changed since last sync

      const { calendarId, nextSyncToken, userId } = params;

      const updatedEvents = await gcalService.getEvents(gcal, {
        calendarId: calendarId,
        syncToken: nextSyncToken,
      });

      // Save the updated sync token for next time
      const syncTokenUpdateResult = await this.updateNextSyncToken(
        params.userId,
        updatedEvents.data.nextSyncToken
      );
      prepResult.syncToken = syncTokenUpdateResult;

      // Update Compass' DB
      const { eventsToDelete, eventsToUpdate } = categorizeGcalEvents(
        updatedEvents.data.items
      );

      const summary = getSummary(eventsToUpdate, eventsToDelete);
      logger.debug(summary);

      prepResult.operations = assembleBulkOperations(
        userId,
        eventsToDelete,
        eventsToUpdate
      );

      return prepResult;
    } catch (e) {
      logger.error(`Errow while sycning\n`, e);
      syncFileLogger.error(`Errow while sycning\n`, e);
      const err = new BaseError(
        "Sync Update Failed",
        e,
        Status.INTERNAL_SERVER,
        true
      );

      prepResult.errors.push(err);
      return prepResult;
    }
  };

  refreshChannelWatch = async (
    userId: string,
    gcal: gCalendar,
    reqParams: Request_Sync_Gcal
  ) => {
    const stopResult = await this.stopWatch(
      gcal,
      reqParams.channelId,
      reqParams.resourceId
    );

    // create new channelId to prevent `channelIdNotUnique` google api error
    const newChannelId = `r--${uuidv4()}`;
    const startResult = await this.startWatchingEvents(
      gcal,
      userId,
      GCAL_PRIMARY,
      newChannelId
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

    // [`google.events.${data.calendarId}`]: {
    const result = await mongoService.db.collection(Collections.SYNC).updateOne(
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

    return result;
  };
}

export default new SyncService();

/*
/--
        const resourceIdResult = await this.updateResourceId(
          reqParams.channelId,
          reqParams.resourceId
        );
        if (resourceIdResult.ok === 1) {
          result.init = `A new notification channel was successfully created for: channelId '${reqParams.channelId}' resourceId: '${reqParams.resourceId}'`;
        } else {
          result.init = {
            "Something failed while setting the resourceId:": resourceIdResult,
          };
        }

  updateResourceId = async (channelId: string, resourceId: string) => {
    // the resourceId shouldn't change frequently (or at all?),
    // so it might be safe to remove this step (after adequate confirmation)
    logger.debug(`Updating resourceId to: ${resourceId}`);
    const result = await mongoService.db
      .collection(Collections.CALENDARLIST)
      .findOneAndUpdate(
        { "google.items.sync.channelId": channelId },
        {
          $set: {
            "google.items.$.sync.resourceId": resourceId,
            updatedAt: new Date().toISOString(),
          },
        }
      );

    return result;
  };


  //-- remove
  async saveEventSyncData(
    userId: string,
    calendarId: string,
    channelId: string,
    resourceId: string
  ) {
    logger.debug("Saving watch info");
    const watchInfo = { userId, calendarId, channelId, resourceId };
    const saveRes = await mongoService.db
      .collection(Collections.WATCHLOG_GCAL)
      .insertOne(watchInfo);
    return saveRes;
  }
*/
//old schema //--
//     const result = await mongoService.db
// .collection(Collections.CALENDARLIST)
// .findOneAndUpdate(
//   // TODO update after supporting more calendars
//   { user: userId, "google.items.primary": true },
//   {
//     $set: {
//       "google.items.$.sync.channelId": channelId,
//       "google.items.$.sync.resourceId": resourceId,
//       "google.items.$.sync.expiration": expiration,
//     },
//   }
// );
