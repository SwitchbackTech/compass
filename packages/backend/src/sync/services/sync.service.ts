import { calendar_v3 } from "googleapis";

import { SyncParams$Gcal, SyncResult$Gcal } from "@core/types/sync.types";
import {
  getGcal,
  updateNextSyncToken,
} from "@auth/services/google.auth.service";
import { BaseError } from "@common/errors/errors.base";
import { Status } from "@common/errors/status.codes";
import { Logger } from "@common/logger/common.logger";
import { BASEURL } from "@core/core.constants";
import {
  GCAL_NOTIFICATION_URL,
  GCAL_PRIMARY,
} from "@common/constants/backend.constants";

import { daysFromNowTimestamp } from "../../../../core/src/util/date.utils";
import { syncUpdates, updateStateAndResourceId } from "./sync.helpers";

const logger = Logger("app:sync.service");

class SyncService {
  async syncGcalEvents(
    params: SyncParams$Gcal
  ): Promise<SyncResult$Gcal | BaseError> {
    try {
      const syncResult = {
        request: params,
        init: undefined,
        sync: undefined,
      };
      // A new channel was successfully create (we can expect to start receiving notifications for it)
      if (params.resourceState === "sync") {
        //TODO error handle
        const updateIdsResult = updateStateAndResourceId(
          params.calendarId,
          params.resourceId
        );
        syncResult.init = updateIdsResult;
      }

      // There is new data to sync from GCal //
      else if (params.resourceState === "exists") {
        logger.debug(`Running sync for:
              calendarId: ${params.calendarId},
              resourceId: ${params.resourceId},
              resourceState: ${params.resourceState},
              expiration: ${params.expiration},
      `);
        syncResult.sync = await syncUpdates(params);
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

      logger.debug(JSON.stringify(syncResult, null, 2));
      return syncResult;
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
