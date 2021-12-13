import { v4 as uuidv4 } from "uuid";
import { calendar_v3 } from "googleapis";
import { gParamsEventsList } from "declarations";

import { SyncResult$Gcal } from "@core/types/sync.types";
import { OAuthDTO } from "@core/types/auth.types";
import GoogleOauthService, {
  getGcal,
} from "@auth/services/google.auth.service";
import { Collections } from "@common/constants/collections";
import gcalService from "@common/services/gcal.service";
import mongoService from "@common/services/mongo.service";
import { BaseError } from "@common/errors/errors.base";
import { Status } from "@common/errors/status.codes";
import { Logger } from "@common/logger/common.logger";
import eventService from "@event/services/event.service";
import { BASEURL } from "@core/core.constants";
import {
  GCAL_NOTIFICATION_URL,
  GCAL_PRIMARY,
} from "@common/constants/backend.constants";
import { GcalMapper } from "@common/helpers/map.gcal";

import { daysFromNowTimestamp } from "../../../../core/src/util/date.utils";

const logger = Logger("app:sync.service");

/* 
Helpers
*/
const updateStateAndResourceId = async (
  calendarId: string,
  resourceId: string
) => {
  logger.debug("Updating state/calendarId for future reference");
  const result = await mongoService.db
    .collection(Collections.OAUTH)
    .findOneAndUpdate(
      { state: calendarId },
      {
        $set: {
          resourceId: resourceId,
          updatedAt: new Date().toISOString(),
        },
      }
    );
  return result;
};

const updateNextSyncToken = async (
  calendarId: string,
  nextSyncToken: string
) => {
  logger.debug(`Updating nextSyncToken to: ${nextSyncToken}`);
  const result = await mongoService.db
    .collection(Collections.OAUTH)
    .findOneAndUpdate(
      { state: calendarId },
      {
        $set: {
          "tokens.nextSyncToken": nextSyncToken,
          updatedAt: new Date().toISOString(),
        },
      }
    );
  if (result.ok !== 1) {
    logger.debug("nextSyncToken not updated", result.lastErrorObject);
  }
  return result;
};

class SyncService {
  async syncGcalEvents(
    calendarId: string,
    resourceId: string,
    resourceState: string,
    expiration: number
  ): Promise<SyncResult$Gcal | BaseError> {
    try {
      // A channel was setup successfully to listen for changes //
      if (resourceState === "sync") {
        //TODO error handle
        const updateIdsResult = updateStateAndResourceId(
          calendarId,
          resourceId
        );
      }

      // There is new data to sync from GCal //
      if (resourceState === "exists") {
        logger.debug(`Initiating sync for:
            calendarId: ${calendarId},
            resourceId: ${resourceId},
            resourceState: ${resourceState},
            expiration: ${expiration},
    `);

        // Get the tokens and initialize GoogleOauth //
        // TODO move this to google.auth.service
        // TODO should you be using resourceId for find?
        const oauth: OAuthDTO = await mongoService.db
          .collection(Collections.OAUTH)
          .findOne({ resourceId: resourceId });

        const gcal = await getGcal(oauth.user);

        if (oauth && oauth.state == calendarId) {
          logger.debug("Finding new events");

          // Fetch the changes to events //
          // Note: will potentially need to handle pageToken in case a lot of new events
          // changed

          const updatedEvents = await gcalService.getEvents(gcal, {
            calendarId: GCAL_PRIMARY, // todo revert back to actual id?
            syncToken: oauth.tokens.nextSyncToken,
          });
          logger.debug(`found ${updatedEvents.data.items.length} events:`);
          logger.debug(JSON.stringify(updatedEvents.data.items));

          await updateNextSyncToken(
            calendarId,
            updatedEvents.data.nextSyncToken
          );

          /*
          instead of just omitting deleted events,
          you need to keep track of them and delete from compass also

          approach 1 - categorize:
            - eventsToDel = [{}, {}]
            - eventsToUpdate = [{}, {}]

            updateMany(upsert: true, eventsToUpdate)
            - creates doc if none match already
          */

          const cEvents = GcalMapper.toCompass(
            oauth.user,
            updatedEvents.data.items
          );
          const updateResult = await eventService.updateManyForGcalSync(
            oauth.user,
            cEvents
          );
          logger.debug(updateResult);
          logger.debug(JSON.stringify(updateResult));
        }
        // Sync the changes to our DB //
        // findOneAndUpdate based on the id / gcalId
        /*

          //TODO error-handle response
          // await sync.events(events, oauth.user);
          await eventService.syncGcalChanges(events, oauth.user);
        }

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
      }

      const result = {
        foo: {
          calendarId: calendarId,
          resourceId: resourceId,
          resourceState: resourceState,
          expiration: expiration,
        },
      };

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
          "Start Watch Failed",
          `We're already watching this channel: ${channelId}`,
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
