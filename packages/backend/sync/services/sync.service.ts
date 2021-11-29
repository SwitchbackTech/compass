import { v4 as uuidv4 } from "uuid";

import GoogleOauthService from "../../auth/services/google.auth.service";
import { Collections } from "../../common/constants/collections";
import gcalService from "../../common/services/gcal.service";
import mongoService from "../../common/services/mongo.service";
import { OAuthDTO } from "../../../core/src/types/auth.types";
import eventService from "../../event/services/event.service";

class SyncService {
  async syncGcalEvents(
    calendarId: string,
    resourceId: string,
    resourceState: string,
    expiration: number
  ) {
    const state = "decideIfKeepingAs 'state' or use 'calendarId";
    // This means a channel was setup successfully to listen for changes //
    if (resourceState === "sync") {
      console.log("[Channel registered]");
      console.log("Channel-ID =>", calendarId);
      console.log("Expiration =>", expiration);
      console.log("Resource ID =>", resourceId);

      // Update the resourceID for future reference //
      // TODO error-handle
      await mongoService.db.collection(Collections.OAUTH).findOneAndUpdate(
        { state: state },
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
      console.log("Initiating Sync =>", state);

      // Get the tokens and initialize GoogleOauth //
      // TODO move this to google.auth.service
      const oauth: OAuthDTO = await mongoService.db
        .collection(Collections.OAUTH)
        .findOne({ resourceId: resourceId });

      const google = new GoogleOauthService();

      await google.setTokens(null, oauth.tokens);

      if (oauth && oauth.state == state) {
        // Fetch the changes to events //
        const { events, nextSyncToken } = await gcalService.getEvents(
          google,
          oauth.nextSyncToken
        );
        console.log("events (from googleapi):\n", events.length);

        // Update the nextSyncToken for future syncs //
        // TODO error-handle response
        await mongoService.db.collection(Collections.OAUTH).findOneAndUpdate(
          { state: state },
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
        await gcalService.stopWatching("gcalInstance", state, resourceId);
      }

      // If the channel is going to expire soon (within 3 days), create a new channel with extended expiry //
      if (new Date(expiration).getTime() - new Date().getTime() < 259200000) {
        console.log("Extending Channel Expiry =>", resourceId);

        // Create a new state ID //
        const newState = uuidv4();
        // Listen to resources using this new state //
        await gcalService.watchCalendar("gcalinstance", calendarId, newState);
        // Update the state in User OAuth //
        //TODO error-handle response
        await mongoService.db
          .collection(Collections.OAUTH)
          .findOneAndUpdate(
            { state: state },
            { $set: { state: newState, updatedAt: new Date().toISOString() } }
          );
      }
    }

    return "some summary of how the sync went";
  }
}

export default new SyncService();
