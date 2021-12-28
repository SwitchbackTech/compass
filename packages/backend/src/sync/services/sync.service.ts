import { v4 as uuidv4 } from "uuid";
import { gCalendar, gSchema$Channel } from "declarations";
import { calendar_v3 } from "googleapis";

import { BASEURL } from "@core/core.constants";
import { Schema_Oauth } from "@core/types/auth.types";
import { Schema_Calendar } from "@core/types/calendar.types";
import { minutesFromNow, daysFromNowTimestamp } from "@core/util/date.utils";
import {
  Request_Sync_Gcal,
  Result_Notif_Gcal,
  Result_Sync_Gcal,
  Params_Sync_Gcal,
} from "@core/types/sync.types";
import { getGcal } from "@auth/services/google.auth.service";
import { BaseError } from "@common/errors/errors.base";
import { Status } from "@common/errors/status.codes";
import { Logger } from "@common/logger/common.logger";
import {
  GCAL_NOTIFICATION_URL,
  GCAL_PRIMARY,
} from "@common/constants/backend.constants";
import { Collections } from "@common/constants/collections";
import gcalService from "@common/services/gcal/gcal.service";
import mongoService from "@common/services/mongo.service";

import {
  assembleBulkOperations,
  categorizeGcalEvents,
  channelRefreshNeeded,
  updateNextSyncToken,
  updateResourceId,
  updateResourceIdAndChannelId,
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
        events: undefined,
      };

      if (reqParams.resourceState === "sync") {
        const resourceIdResult = await updateResourceId(
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
      //TODO create validation function and move there
      else if (reqParams.resourceState === "exists") {
        const { channelPrepResult, calendar, gcal } =
          await this.prepareSyncChannels(reqParams);

        result.watch = channelPrepResult;

        const params: Params_Sync_Gcal = {
          ...reqParams,
          userId: calendar.user,
          // nextSyncToken: oauth.tokens.nextSyncToken,
          nextSyncToken: oauth.tokens.nextSyncToken,
          calendarId: `${GCAL_NOTIFICATION_URL} <- hard-coded for now`,
        };
        result.params = params;
        result.events = await _syncUpdates(gcal, params);
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
    calendarId: string,
    channelId: string
  ): Promise<gSchema$Channel> {
    logger.info(
      `Setting up watch for calendarId: '${calendarId}' and channelId: '${channelId}'`
    );
    try {
      const numMin = 10;

      // TODO uncomment
      // const expiration = daysFromNowTimestamp(14, "ms").toString();
      console.log(
        `**REMINDER: channel is expiring in just ${numMin} mins. Change before deploying **`
      );
      const expiration = minutesFromNow(numMin, "ms").toString();

      const response = await gcal.events.watch({
        calendarId: calendarId,
        requestBody: {
          id: channelId,
          address: `${BASEURL}${GCAL_NOTIFICATION_URL}`,
          type: "web_hook",
          expiration: expiration,
        },
      });
      return response.data;
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
  ) {
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
        return {
          stopWatching: {
            result: "success",
            channelId: channelId,
            resourceId: resourceId,
          },
        };
      }

      return { stopWatching: stopResult };
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
    const calendar: Schema_Calendar = await mongoService.db
      .collection(Collections.CALENDAR)
      .findOne({ "google.items.sync.resourceId": reqParams.resourceId });

    logger.debug(`calendar, need to get nextSyncToken`);
    logger.debug(JSON.stringify(calendar));

    const gcal = await getGcal(calendar.user);

    const refreshNeeded = channelRefreshNeeded(reqParams, calendar);
    if (refreshNeeded) {
      channelPrepResult.refresh = await this.refreshChannelWatch(
        calendar.user,
        gcal,
        reqParams
      );
    } else {
      channelPrepResult.stillActive = true;
    }

    return { channelPrepResult, calendar, gcal };
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
      GCAL_PRIMARY,
      newChannelId
    );

    const idUpdates = await updateResourceIdAndChannelId(
      userId,
      newChannelId,
      reqParams.resourceId
    );

    const refreshResult = {
      stop: stopResult,
      start: startResult,
      idUpdates: idUpdates.ok === 1,
    };
    return refreshResult;
  };
}

export default new SyncService();

/*************************************************************/
/*  Internal Helpers
      These have too many dependencies to go in sync.helpers, 
      which makes testing harder. So, keep here for now */
/*************************************************************/

const _syncUpdates = async (
  gcal: gCalendar,
  params: Params_Sync_Gcal
): Promise<Result_Sync_Gcal | BaseError> => {
  const syncResult = {
    syncToken: undefined,
    result: undefined,
  };

  try {
    // Fetch the changes to events //
    // TODO: handle pageToken in case a lot of new events changed

    logger.debug("Fetching updated gcal events");
    const updatedEvents = await gcalService.getEvents(gcal, {
      // TODO use calendarId once supporting non-'primary' calendars
      // calendarId: params.calendarId,
      calendarId: GCAL_PRIMARY,
      syncToken: params.nextSyncToken,
    });

    // Save the updated sync token for next time
    // Should you do this even if no update found;?
    // could potentially do this without awaiting to speed up
    const syncTokenUpdateResult = await updateNextSyncToken(
      params.userId,
      updatedEvents.data.nextSyncToken
    );
    syncResult.syncToken = syncTokenUpdateResult;

    if (updatedEvents.data.items.length === 0) {
      return new BaseError(
        "No updates found",
        "Not sure if this is normal or not",
        Status.NOT_FOUND,
        true
      );
    }

    logger.debug(`Found ${updatedEvents.data.items.length} events to update`);
    // const eventNames = updatedEvents.data.items.map((e) => e.summary);
    // logger.debug(JSON.stringify(eventNames));
    // Update Compass' DB
    const { eventsToDelete, eventsToUpdate } = categorizeGcalEvents(
      updatedEvents.data.items
    );

    const bulkOperations = assembleBulkOperations(
      params.userId,
      eventsToDelete,
      eventsToUpdate
    );

    syncResult.result = await mongoService.db
      .collection(Collections.EVENT)
      .bulkWrite(bulkOperations);

    return syncResult;
  } catch (e) {
    logger.error(`Errow while sycning\n`, e);
    return new BaseError("Sync Update Failed", e, Status.INTERNAL_SERVER, true);
  }
};
