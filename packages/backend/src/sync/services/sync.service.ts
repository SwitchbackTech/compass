import { calendar_v3 } from "googleapis";

import {
  SyncParams$Gcal,
  NotifResult$Gcal,
  SyncEventsResult$Gcal,
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
  updateNextSyncToken,
  updateStateAndResourceId,
} from "./sync.helpers";
import { daysFromNowTimestamp } from "../../../../core/src/util/date.utils";

const logger = Logger("app:sync.service");

const _syncUpdates = async (
  params: SyncParams$Gcal
): Promise<SyncEventsResult$Gcal | BaseError> => {
  const syncResult = {
    syncToken: undefined,
    result: undefined,
  };

  try {
    const oauth: OAuthDTO = await mongoService.db
      .collection(Collections.OAUTH)
      .findOne({ resourceId: params.resourceId });

    //TODO create validation function and move there
    // the calendarId created during watch channel setup used the oauth.state,
    //  so these should be the same.
    if (oauth.state !== params.calendarId) {
      return new BaseError(
        "Sync Failed",
        `Calendar id and oauth state didnt match. calendarId: ${params.calendarId}
    oauth.state: ${oauth.state}`,
        Status.INTERNAL_SERVER,
        false // this isnt currently stopping the program like expected. not sure why
      );
    }

    // Fetch the changes to events //
    // TODO: handle pageToken in case a lot of new events changed
    const gcal = await getGcal(oauth.user);

    logger.debug("Fetching updated gcal events");
    const updatedEvents = await gcalService.getEvents(gcal, {
      // TODO use calendarId once supporting non-'primary' calendars
      // calendarId: params.calendarId,
      calendarId: GCAL_PRIMARY,
      syncToken: oauth.tokens.nextSyncToken,
    });

    // Save the updated sync token for next time
    // Should you do this even if no update found;?
    // could potentially do this without awaiting to speed up
    const syncTokenUpdateResult = await updateNextSyncToken(
      oauth.user,
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
      oauth.user,
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

class SyncService {
  async handleGcalNotification(
    params: SyncParams$Gcal
  ): Promise<NotifResult$Gcal | BaseError> {
    try {
      const result = {
        request: params,
        init: undefined,
        events: undefined,
      };
      if (params.resourceState === "sync") {
        logger.info(
          "A new notification channel was successfully created. Expect to receive notifications from Gcal upon changes"
        );
        const updateIdsResult = await updateStateAndResourceId(
          params.calendarId,
          params.resourceId
        );
        result.init = updateIdsResult;
      }

      // There is new data to sync from GCal //
      else if (params.resourceState === "exists") {
        logger.debug(`Running sync for:
              calendarId /oauth.state: 
                now: ${GCAL_PRIMARY} (hard-coded)
                future: ${params.calendarId},
              resourceId: ${params.resourceId},
              resourceState: ${params.resourceState},
              expiration: ${params.expiration},
      `);
        result.events = await _syncUpdates(params);
      }
      /*
        // If `oauth.state` does not match, it means the channel has expired and and we need to `stop` listening to this channel //
        else {
          //TODO error-handle response
          await gcalService.stopWatching(
            "gcalInstance",
            calendarId,
            resourceId
          );
        }

        // If the channel is going to expire soon (within 3 days), create a new channel with extended expiry //
        if (new Date(expiration).getTime() - new Date().getTime() < 259200000) {
          logger.info(
            `Channel expires soon. Creating a new one for resourceId: => ${resourceId}`
          );

          // Create a new state ID //
          const newState = uuidv4();
          // Listen to resources using this new state //
          await gcalService.watchCalendar("gcalinstance", calendarId, newState);
          // Update the state in User OAuth //
          //TODO error-handle response
          await mongoService.db
            .collection(Collections.OAUTH)
            .findOneAndUpdate(
              { state: calendarId },
              { $set: { state: newState, updatedAt: new Date().toISOString() } }
            );
        }
        */
      // }

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
    gcal: calendar_v3.Calendar,
    calendarId: string,
    channelId: string
  ) {
    logger.info(`Setting up watch for calendarId: ${calendarId}`);
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
          "Watch request ignored",
          `We're already watching this channel: ${channelId}. The watch should still be active`,
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
}

export default new SyncService();
