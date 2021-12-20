import { gCalendar, gSchema$Channel } from "declarations";

import {
  SyncRequest$Gcal,
  NotifResult$Gcal,
  SyncEventsResult$Gcal,
  SyncParams$Gcal,
} from "@core/types/sync.types";
import { getGcal } from "@auth/services/google.auth.service";
import { BaseError } from "@common/errors/errors.base";
import { Status } from "@common/errors/status.codes";
import { Logger } from "@common/logger/common.logger";
import { BASEURL } from "@core/core.constants";
import {
  GCAL_NOTIFICATION_URL,
  GCAL_PRIMARY,
} from "@common/constants/backend.constants";
import { Collections } from "@common/constants/collections";
import gcalService from "@common/services/gcal/gcal.service";
import mongoService from "@common/services/mongo.service";
import { OAuthDTO } from "@core/types/auth.types";

import {
  assembleBulkOperations,
  categorizeGcalEvents,
  channelExpiresSoon,
  updateNextSyncToken,
  updateResourceId,
} from "./sync.helpers";
import { daysFromNowTimestamp } from "../../../../core/src/util/date.utils";

const logger = Logger("app:sync.service");

class SyncService {
  async handleGcalNotification(
    reqParams: SyncRequest$Gcal
  ): Promise<NotifResult$Gcal | BaseError> {
    try {
      const result = {
        params: undefined,
        init: undefined,
        events: undefined,
      };

      if (reqParams.resourceState === "sync") {
        logger.info(
          "A new notification channel was successfully created. Expect to receive notifications from Gcal upon changes"
        );

        // declaring this variable as a reminder that the
        // oauth.state and channelId should be the same
        const oauthState = reqParams.channelId;

        const resourceIdInitResult = await updateResourceId(
          oauthState,
          reqParams.resourceId
        );
        result.init = resourceIdInitResult;
      }

      // There is new data to sync from GCal //
      //TODO create validation function and move there
      else if (reqParams.resourceState === "exists") {
        const { oauth, gcal } = await this._prepareSyncChannels(reqParams);

        const params: SyncParams$Gcal = {
          ...reqParams,
          userId: oauth.user,
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
      return new BaseError("Sync Failed", e, Status.INTERNAL_SERVER, true);
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
      const expiration = daysFromNowTimestamp(14, "ms").toString();

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
        return new BaseError(
          "Start Watch Failed",
          e.errors,
          Status.BAD_REQUEST,
          true
        );
      } else {
        logger.error(e);
        return new BaseError(
          "Start Watch Failed",
          e,
          Status.INTERNAL_SERVER,
          true
        );
      }
    }
  }

  async stopWatchingChannel(
    userId: string,
    channelId: string,
    resourceId: string
  ) {
    logger.info(
      `Stopping watch for channel: ${channelId} and resource: ${resourceId}`
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
          true
        );
      }

      logger.error(e);
      return new BaseError(
        "Stop Watch Failed",
        e,
        Status.INTERNAL_SERVER,
        true
      );
    }
  }

  _prepareSyncChannels = async (reqParams: SyncRequest$Gcal) => {
    // initialize what you'll need later
    const oauth: OAuthDTO = await mongoService.db
      .collection(Collections.OAUTH)
      .findOne({ resourceId: reqParams.resourceId });

    const gcal = await getGcal(oauth.user);

    // The calendarId created during watch channel setup used the oauth.state,so
    // these should be the same.
    const channelExpired = oauth.state !== reqParams.channelId;
    if (channelExpired) {
      logger.info(`Channel expired, so stopping watch on the old channel and resource: 
          channel: ${reqParams.channelId}, 
          resource: ${reqParams.resourceId}`);
      const foo = await this.stopWatchingChannel(
        oauth.user,
        reqParams.channelId,
        reqParams.resourceId
      );
      logger.debug("temp: stop watch res:", foo);
    }

    // const _channelExpiresSoon = channelExpiresSoon(reqParams.expiration);
    // TODO replace
    const _channelExpiresSoon = true;

    if (channelExpired || _channelExpiresSoon) {
      logger.info(
        `Creating new channel watch for resourceId: ${reqParams.resourceId}`
      );
      const startRes = await this.startWatchingChannel(
        gcal,
        GCAL_PRIMARY,
        reqParams.channelId
      );
      logger.debug(`Temp: StartWatch res:`, startRes);
    }

    return { oauth, gcal };
  };
}
export default new SyncService();

/*  Internal Helpers
      These have too many dependencies to go in sync.helpers, 
      which makes testing harder. So, keep here for now
*/

const _syncUpdates = async (
  gcal: gCalendar,
  params: SyncParams$Gcal
): Promise<SyncEventsResult$Gcal | BaseError> => {
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
