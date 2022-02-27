import { v4 as uuidv4 } from "uuid";
import { gCalendar } from "declarations";
import { Schema_CalendarList } from "@core/types/calendar.types";
import {
  Params_Sync_Gcal,
  Request_Sync_Gcal,
  Result_Notif_Gcal,
  Result_Start_Watch,
  Result_Stop_Watch,
  Result_Sync_Prep_Gcal,
} from "@core/types/sync.types";
import { BaseError } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";
import { getGcal } from "@backend/auth/services/google.auth.service";
import { Logger } from "@core/logger/winston.logger";
import {
  GCAL_NOTIFICATION_URL,
  GCAL_PRIMARY,
} from "@backend/common/constants/backend.constants";
import { Collections } from "@backend/common/constants/collections";
import { isDev } from "@backend/common/helpers/common.helpers";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";
import devService from "@backend/dev/services/dev.service";

import {
  assembleBulkOperations,
  categorizeGcalEvents,
  channelRefreshNeeded,
  findCalendarByResourceId,
  getChannelExpiration,
} from "./sync.helpers";

const logger = Logger("app:sync.service");

class SyncService {
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

      logger.debug(JSON.stringify(result, null, 2));
      return result;
    } catch (e) {
      logger.error(e);
      return new BaseError("Sync Failed", e, Status.INTERNAL_SERVER, false);
    }
  }

  /*
  Setup the notification channel for a user's calendar,
  telling google where to notify us when an event changes
  */
  async startWatchingChannel(
    gcal: gCalendar,
    userId: string,
    calendarId: string,
    channelId: string
  ): Promise<Result_Start_Watch> {
    logger.info(
      `Setting up watch for calendarId: '${calendarId}' and channelId: '${channelId}'`
    );

    try {
      const _expiration = getChannelExpiration();
      const response = await gcal.events.watch({
        calendarId: calendarId,
        requestBody: {
          id: channelId,
          // address always needs to be HTTPS, so use prod url
          address: `${process.env.BASEURL_PROD}${GCAL_NOTIFICATION_URL}`,
          type: "web_hook",
          expiration: _expiration,
        },
      });

      if (response.data && isDev()) {
        const saveWatchInfoRes = await devService.saveWatchInfo(
          userId,
          calendarId,
          channelId,
          response.data.resourceId
        );
        return { channel: response.data, saveForDev: saveWatchInfoRes };
      }

      return { channel: response.data };
    } catch (e) {
      if (e.code && e.code === 400) {
        throw new BaseError(
          "Start Watch Failed",
          e.errors,
          Status.BAD_REQUEST,
          false
        );
      } else {
        logger.error(e);
        throw new BaseError(
          "Start Watch Failed",
          e.toString(),
          Status.INTERNAL_SERVER,
          false
        );
      }
    }
  }

  async stopWatchingChannel(
    userId: string,
    channelId: string,
    resourceId: string
  ): Promise<Result_Stop_Watch | BaseError> {
    logger.debug(
      `Stopping watch for channelId: ${channelId} and resourceId: ${resourceId}`
    );
    try {
      const gcal = await getGcal(userId);
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

        if (isDev()) {
          const deleteForDev = await devService.deleteWatchInfo(
            userId,
            channelId,
            resourceId
          );
          return { stopWatching: stopWatchSummary, deleteForDev };
        } else {
          return { stopWatching: stopWatchSummary };
        }
      }

      logger.warn("Stop Watch failed for unexpected reason");
      return { stopWatching: { result: "failed", debug: stopResult } };
    } catch (e) {
      if (e.code && e.code === 404) {
        return new BaseError(
          "Stop Watch Failed",
          e.message,
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

    const gcal = await getGcal(userId);

    const refreshNeeded = channelRefreshNeeded(reqParams, calendarList);
    if (refreshNeeded) {
      channelPrepResult.refresh = await this.refreshChannelWatch(
        userId,
        gcal,
        reqParams
      );
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

      logger.debug(
        `Events to update: ${eventsToUpdate.length}  |  Events to delete: ${eventsToDelete.length}`
      );

      prepResult.operations = assembleBulkOperations(
        params.userId,
        eventsToDelete,
        eventsToUpdate
      );

      return prepResult;
    } catch (e) {
      logger.error(`Errow while sycning\n`, e);
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
    const startResult = await this.startWatchingChannel(
      gcal,
      userId,
      GCAL_PRIMARY,
      newChannelId
    );

    const syncUpdate = await this.updateSyncData(
      userId,
      newChannelId,
      reqParams.resourceId,
      reqParams.expiration
    );

    const refreshResult = {
      stop: stopResult,
      start: startResult,
      syncUpdate: syncUpdate.ok === 1 ? "success" : "failed",
    };
    return refreshResult;
  };

  updateNextSyncToken = async (userId: string, nextSyncToken: string) => {
    logger.debug(`Updating nextSyncToken to: ${nextSyncToken}`);

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
