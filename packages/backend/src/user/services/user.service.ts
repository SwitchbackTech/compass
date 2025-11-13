import { TokenPayload } from "google-auth-library";
import mergeWith from "lodash.mergewith";
import { ObjectId } from "mongodb";
import SupertokensUserMetadata, {
  JSONObject,
} from "supertokens-node/recipe/usermetadata";
import { BaseError } from "@core/errors/errors.base";
import { Logger } from "@core/logger/winston.logger";
import { mapUserToCompass } from "@core/mappers/map.user";
import { mapCompassUserToEmailSubscriber } from "@core/mappers/subscriber/map.subscriber";
import { Resource_Sync } from "@core/types/sync.types";
import { zObjectId } from "@core/types/type.utils";
import { Schema_User, UserMetadata } from "@core/types/user.types";
import { shouldImportGCal } from "@core/util/event/event.util";
import compassAuthService from "@backend/auth/services/compass.auth.service";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import calendarService from "@backend/calendar/services/calendar.service";
import { ENV } from "@backend/common/constants/env.constants";
import { isMissingUserTagId } from "@backend/common/constants/env.util";
import { AuthError } from "@backend/common/errors/auth/auth.errors";
import { error } from "@backend/common/errors/handlers/error.handler";
import { initSupertokens } from "@backend/common/middleware/supertokens.middleware";
import mongoService from "@backend/common/services/mongo.service";
import EmailService from "@backend/email/email.service";
import eventService from "@backend/event/services/event.service";
import priorityService from "@backend/priority/services/priority.service";
import { webSocketServer } from "@backend/servers/websocket/websocket.server";
import syncService from "@backend/sync/services/sync.service";
import { isUsingHttps } from "@backend/sync/util/sync.util";
import { findCompassUserBy } from "@backend/user/queries/user.queries";
import { Summary_Delete } from "@backend/user/types/user.types";

const logger = Logger("app:user.service");

class UserService {
  createUser = async (
    gUser: TokenPayload,
    gRefreshToken: string,
  ): Promise<Schema_User & { userId: string }> => {
    const _compassUser = mapUserToCompass(gUser, gRefreshToken);
    const compassUser = { ..._compassUser, signedUpAt: new Date() };

    const createUserRes = await mongoService.user.insertOne(compassUser);

    const userId = createUserRes.insertedId.toString();
    if (!userId) {
      throw error(AuthError.NoUserId, "Failed to create Compass user");
    }

    return {
      ...compassUser,
      userId,
    };
  };

  deleteCompassDataForUser = async (userId: string, gcalAccess = true) => {
    const summary: Summary_Delete = {};

    try {
      const priorities = await priorityService.deleteAllByUser(userId);
      summary.priorities = priorities.deletedCount;

      const calendars = await calendarService.deleteAllByUser(userId);
      summary.calendars = calendars.deletedCount;

      const events = await eventService.deleteAllByUser(userId);
      summary.events = events.deletedCount;

      if (gcalAccess) {
        const watches = await syncService.stopWatches(userId);
        summary.eventWatches = watches.length;
      }

      const user = await findCompassUserBy("_id", userId);
      if (!user) {
        throw error(AuthError.NoUserId, "Failed to find user");
      }

      const syncs = await syncService.deleteAllByUser(userId);
      summary.syncs = syncs.deletedCount;

      // delete other users with same email
      const staleSyncs = await syncService.deleteAllByGcalId(
        user.google.googleId,
      );
      summary.syncs += staleSyncs.deletedCount;

      initSupertokens();
      const { sessionsRevoked } =
        await compassAuthService.revokeSessionsByUser(userId);
      summary.sessions = sessionsRevoked;

      const _user = await this.deleteUser(userId);
      summary.user = _user.deletedCount;
      return summary;
    } catch (e) {
      const _e = e as BaseError;
      console.log("Stopped early because:", _e.description || _e);

      const _user = await this.deleteUser(userId);
      summary.user = _user.deletedCount;

      return summary;
    }
  };

  deleteUser = async (userId: string) => {
    logger.info(`Deleting all data for user: ${userId}`);

    const response = await mongoService.user.deleteOne({
      _id: mongoService.objectId(userId),
    });

    return response;
  };

  initUserData = async (gUser: TokenPayload, gRefreshToken: string) => {
    const cUser = await this.createUser(gUser, gRefreshToken);
    const { userId, email } = cUser;

    if (isMissingUserTagId()) {
      logger.warn(
        "Did not tag subscriber due to missing EMAILER_ ENV value(s)",
      );
    } else {
      const subscriber = mapCompassUserToEmailSubscriber(cUser);
      await EmailService.addTagToSubscriber(
        subscriber,
        ENV.EMAILER_USER_TAG_ID!,
      );
    }

    await priorityService.createDefaultPriorities(userId);

    await eventService.createDefaultSomedays(userId);

    return { userId, email };
  };

  saveTimeFor = async (label: "lastLoggedInAt", userId: string) => {
    const res = await mongoService.user.findOneAndUpdate(
      { _id: mongoService.objectId(userId) },
      { $set: { [label]: new Date() } },
    );

    return res;
  };

  stopGoogleCalendarSync = async (user: string | ObjectId): Promise<void> => {
    const userId = zObjectId.parse(user).toString();

    await eventService.deleteByIntegration("google", userId);
    await syncService.stopWatches(userId);
    await syncService.deleteByIntegration("google", userId);
  };

  startGoogleCalendarSync = async (user: string): Promise<void> => {
    const gcal = await getGcalClient(user);

    const calendarInit = await calendarService.initializeGoogleCalendars(
      user,
      gcal,
    );

    const gCalendarIds = calendarInit.googleCalendars
      .map(({ id }) => id)
      .filter((id) => id !== undefined && id !== null);

    await Promise.resolve(isUsingHttps()).then((yes) =>
      yes
        ? syncService.startWatchingGcalResources(
            user,
            [
              { gCalendarId: Resource_Sync.CALENDAR },
              ...gCalendarIds.map((gCalendarId) => ({ gCalendarId })),
            ],
            gcal,
          )
        : [],
    );

    await syncService.importFull(gcal, gCalendarIds, user);
  };

  restartGoogleCalendarSync = async (userId: string) => {
    logger.warn(`Restarting Google Calendar sync for user: ${userId}`);

    try {
      webSocketServer.handleImportGCalStart(userId);

      const userMeta = await this.fetchUserMetadata(userId);
      const proceed = shouldImportGCal(userMeta);

      if (!proceed) {
        webSocketServer.handleImportGCalEnd(
          userId,
          `User ${userId} gcal import is in progress or completed, ignoring this request`,
        );

        return;
      }

      await this.updateUserMetadata({
        userId,
        data: { sync: { importGCal: "importing" } },
      });

      await this.stopGoogleCalendarSync(userId);
      await this.startGoogleCalendarSync(userId);

      await this.updateUserMetadata({
        userId,
        data: { sync: { importGCal: "completed" } },
      });

      webSocketServer.handleImportGCalEnd(userId);
      webSocketServer.handleBackgroundCalendarChange(userId);
    } catch (err) {
      await this.updateUserMetadata({
        userId,
        data: { sync: { importGCal: "errored" } },
      });

      logger.error(`Re-sync failed for user: ${userId}`, err);

      webSocketServer.handleImportGCalEnd(
        userId,
        `Import gCal failed for user: ${userId}`,
      );
    }
  };

  /*
   * updateUserMetadata
   *
   * Nested objects and all lower-level properties
   * will merge with existing ones.
   *
   * @memberOf UserService
   */
  updateUserMetadata = async ({
    userId,
    data,
  }: {
    userId: string;
    data: Partial<UserMetadata>;
  }): Promise<UserMetadata> => {
    const value = await this.fetchUserMetadata(userId);
    const update = mergeWith(value, data);

    const { status, metadata } =
      await SupertokensUserMetadata.updateUserMetadata(userId, update);

    if (status !== "OK") throw new Error("Failed to update user metadata");

    return metadata;
  };

  fetchUserMetadata = async (
    userId: string,
    userContext?: Record<string, JSONObject>,
  ): Promise<UserMetadata> => {
    const { status, metadata } = await SupertokensUserMetadata.getUserMetadata(
      userId,
      userContext,
    );

    if (status !== "OK") throw new Error("Failed to fetch user metadata");

    return metadata;
  };
}

export default new UserService();
