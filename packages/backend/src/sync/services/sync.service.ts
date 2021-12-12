import { v4 as uuidv4 } from "uuid";
import { calendar_v3 } from "googleapis";

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
import { GCAL_NOTIFICATION_URL } from "@common/constants/backend.constants";

const logger = Logger("app:sync.service");

class SyncService {
  async syncGcalEvents(
    calendarId: string,
    resourceId: string,
    resourceState: string,
    expiration: number
  ): Promise<SyncResult$Gcal | BaseError> {
    try {
      // This means a channel was setup successfully to listen for changes //
      if (resourceState === "sync") {
        logger.debug("Updating state/calendarId for future reference");
        // TODO error-handle
        await mongoService.db.collection(Collections.OAUTH).findOneAndUpdate(
          { state: calendarId },
          {
            $set: {
              resourceId: resourceId,
              updatedAt: new Date().toISOString(),
            },
          }
        );
      }

      // This means there is new data to sync from GCal //
      if (resourceState === "exists") {
        logger.info(
          `Initiating Sync for \ncalendarId/state: ${calendarId}\nresourceId: ${resourceId}`
        );

        // Get the tokens and initialize GoogleOauth //
        // TODO move this to google.auth.service
        const oauth: OAuthDTO = await mongoService.db
          .collection(Collections.OAUTH)
          .findOne({ resourceId: resourceId });

        const gcal = await getGcal(oauth.user);

        if (oauth && oauth.state == calendarId) {
          logger.debug("Finding new events (not really, stopping here)");
        }
        /*
          // Fetch the changes to events //
          const { nextSyncToken } = await gcalService.getEvents(gcal, {
            syncToken: oauth.tokens.nextSyncToken,
          });

          // Update the nextSyncToken for future syncs //
          // TODO error-handle response
          await mongoService.db.collection(Collections.OAUTH).findOneAndUpdate(
            { state: calendarId },
            {
              $set: {
                nextSyncToken: nextSyncToken,
                updatedAt: new Date().toISOString(),
              },
            }
          );

          // Sync the changes to our DB //
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
      const response = await gcal.events.watch({
        calendarId: calendarId,
        requestBody: {
          id: channelId,
          address: `${BASEURL}${GCAL_NOTIFICATION_URL}`,
          type: "web_hook",
        },
      });
      logger.debug("Watching =>", response);
      return response;
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
      let msg;
      if ("statusText" in e) {
        msg = e.statusText;
      } else {
        msg = e;
      }

      logger.error(e);
      return new BaseError(
        "Stop Watch Failed",
        msg,
        Status.INTERNAL_SERVER,
        true
      );
    }
  }
}

export default new SyncService();
