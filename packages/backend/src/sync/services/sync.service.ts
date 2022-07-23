//@ts-nocheck
import { v4 as uuidv4 } from "uuid";
import { gCalendar } from "@core/types/gcal";
import { Schema_CalendarList } from "@core/types/calendar.types";
import {
  Params_Sync_Gcal,
  Request_Sync_Gcal,
  Result_Notif_Gcal,
  Result_Watch_Start,
  Result_Watch_Stop,
  Result_Watch_Stop_All,
  Result_Sync_Prep_Gcal,
  Result_Watch_Delete,
  Schema_Watch_Gcal,
} from "@core/types/sync.types";
import { BaseError } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import { Logger } from "@core/logger/winston.logger";
import { ENV } from "@backend/common/constants/env.constants";
import {
  GCAL_NOTIFICATION_URL,
  GCAL_PRIMARY,
} from "@backend/common/constants/backend.constants";
import { Collections } from "@backend/common/constants/collections";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";

import {
  assembleBulkOperations,
  categorizeGcalEvents,
  channelRefreshNeeded,
  findCalendarByResourceId,
  getChannelExpiration,
  getSummary,
} from "./sync.helpers";

const logger = Logger("app:sync.service");
// separate logger to keep main less noisy
const syncFileLogger = Logger("app:sync.gcal", "logs/sync.gcal.log");

class SyncService {
  async deleteWatchInfo(
    userId: string,
    channelId: string,
    resourceId: string
  ): Promise<Result_Watch_Delete> {
    const delWatchInfo = await mongoService.db
      .collection(Collections.WATCHLOG_GCAL)
      .deleteOne({ userId, channelId, resourceId });

    const delRes = delWatchInfo.acknowledged ? "success" : "failed";
    return { result: delRes };
  }

  async handleGcalNotification(
    reqParams: Request_Sync_Gcal
  ): Promise<Result_Notif_Gcal | BaseError> {
    try {
      const result = {
        params: undefined,
        init: undefined,
        watch: undefined,
        prep: undefined,
        events: undefined,
      };

      if (reqParams.resourceState === "sync") {
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
      }

      // There is new data to sync from GCal //
      else if (reqParams.resourceState === "exists") {
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
  }

  async saveWatchInfo(
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

    if (saveRes.acknowledged) {
      return "success";
    } else {
      logger.error("Failed to save watch info");
      logger.error(saveRes);
      return "failed";
    }
  }

  /*
  Setup the notification channel for a user's calendar,
  telling google where to notify us when an event changes
  */
  async startWatchingCalendar(
    gcal: gCalendar,
    userId: string,
    calendarId: string,
    channelId?: string
  ): Promise<Result_Watch_Start> {
    if (!channelId) channelId = uuidv4();

    logger.info(
      `Setting up watch for calendarId: '${calendarId}' and channelId: '${channelId}'`
    );

    try {
      const _expiration = getChannelExpiration();
      const watchRes = await gcal.events.watch({
        calendarId: calendarId,
        requestBody: {
          id: channelId,
          // uses prod URL because address always needs to be HTTPS
          // TODO: once dedicated e2e test VM, use that instead of prod
          address: `${ENV.BASEURL_PROD}${GCAL_NOTIFICATION_URL}`,
          type: "web_hook",
          expiration: _expiration,
        },
      });

      const resourceId = watchRes.data.resourceId || "missingResourceId";
      const saveWatchInfoRes = await this.saveWatchInfo(
        userId,
        calendarId,
        channelId,
        resourceId
      );
      const syncUpdate = await this.updateSyncData(
        userId,
        channelId,
        resourceId,
        _expiration
      );

      return {
        watchResult: { channel: watchRes.data, saveForDev: saveWatchInfoRes },
        syncUpdate,
      };
    } catch (e) {
      if (e.code && e.code === 400) {
        throw new BaseError(
          "Start Watch / Sync Update Failed",
          JSON.stringify(e.errors),
          Status.BAD_REQUEST,
          false
        );
      } else {
        logger.error(e);
        throw new BaseError(
          "Start Watch  / Sync Update Failed",
          JSON.stringify(e),
          Status.INTERNAL_SERVER,
          false
        );
      }
    }
  }

  async stopAllChannelWatches(
    userId: string
  ): Promise<Result_Watch_Stop_All | BaseError> {
    try {
      logger.info(`Stopping all watches for user: ${userId}`);
      const allWatches = (await mongoService.db
        .collection(Collections.WATCHLOG_GCAL)
        .find({ userId: userId })
        .toArray()) as Schema_Watch_Gcal[];

      if (allWatches.length === 0) {
        return {
          summary: "success",
          message: `no active watches for user: ${userId}`,
        };
      }

      const watchResults = [];
      for (const w of allWatches) {
        const stopResult = await this.stopWatchingChannel(
          userId,
          w.channelId,
          w.resourceId
        );
        if ("statusCode" in stopResult) {
          // then it failed
          // TODO this assumes it failed cuz of 404 not found,
          // make more dynamic
          const filter = { userId, channelId: w.channelId };
          const delRes = await mongoService.db
            .collection(Collections.WATCHLOG_GCAL)
            .deleteOne(filter);
          const dr = delRes.acknowledged ? "pruned" : "prune failed";
          watchResults.push(`${w.channelId}: ${dr}`);
        } else {
          const channelId = stopResult.stopWatching.channelId || "unsure";
          watchResults.push(`${channelId}: ${stopResult.deleteWatch.result}`);
        }
      }

      const watchStopSummary = { summary: "success", watches: watchResults };
      return watchStopSummary;
    } catch (e) {
      logger.error(e);
      return new BaseError(
        "Stop All Watches Failed",
        JSON.stringify(e),
        Status.UNSURE,
        false
      );
    }
  }

  async stopWatchingChannel(
    userId: string,
    channelId: string,
    resourceId: string
  ): Promise<Result_Watch_Stop | BaseError> {
    logger.debug(
      `Stopping watch for channelId: ${channelId} and resourceId: ${resourceId}`
    );
    try {
      const gcal = await getGcalClient(userId);

      const params = {
        requestBody: {
          id: channelId,
          resourceId: resourceId,
        },
      };

      const stopResult = await gcal.channels.stop(params);

      if (stopResult.status === 204) {
        const stopWatchSummary = {
          result: "success",
          channelId: channelId,
          resourceId: resourceId,
        };

        const deleteWatchSummary = await this.deleteWatchInfo(
          userId,
          channelId,
          resourceId
        );
        return {
          stopWatching: stopWatchSummary,
          deleteWatch: deleteWatchSummary,
        };
      }

      logger.warn("Stop Watch failed for unexpected reason");
      return {
        stopWatching: { result: "failed", debug: stopResult },
        deleteWatch: { result: "failed" },
      };
    } catch (e) {
      if (e.code && e.code === 404) {
        return new BaseError(
          "Stop Watch Failed",
          JSON.stringify(e?.message),
          Status.NOT_FOUND,
          false
        );
      }

      logger.error(e);
      return new BaseError(
        "Stop Watch Failed",
        e,
        Status.INTERNAL_SERVER,
        false
      );
    }
  }

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

    const gcal = await getGcalOLD(userId);

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

      const updatedEvents = await gcalService.getEvents(gcal, {
        calendarId: params.calendarId,
        syncToken: params.nextSyncToken,
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
        params.userId,
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
    const stopResult = await this.stopWatchingChannel(
      userId,
      reqParams.channelId,
      reqParams.resourceId
    );

    // create new channelId to prevent `channelIdNotUnique` google api error
    const newChannelId = `pri-rfrshd${uuidv4()}`;
    const startResult = await this.startWatchingCalendar(
      gcal,
      userId,
      GCAL_PRIMARY,
      newChannelId
    );

    // const syncUpdate = await this.updateSyncData( //--
    //   userId,
    //   newChannelId,
    //   reqParams.resourceId,
    //   reqParams.expiration
    // );

    const refreshResult = {
      stop: stopResult,
      start: startResult,
      // syncUpdate: syncUpdate.ok === 1 ? "success" : "failed",
    };
    return refreshResult;
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
              updatedAt: new Date().toISOString(),
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

  updateSyncData = async (
    userId: string,
    channelId: string,
    resourceId: string,
    expiration: string
  ) => {
    const result = await mongoService.db
      .collection(Collections.CALENDARLIST)
      .findOneAndUpdate(
        // TODO update after supporting more calendars
        { user: userId, "google.items.primary": true },
        {
          $set: {
            "google.items.$.sync.channelId": channelId,
            "google.items.$.sync.resourceId": resourceId,
            "google.items.$.sync.expiration": expiration,
          },
        }
      );

    return result;
  };
}

export default new SyncService();
