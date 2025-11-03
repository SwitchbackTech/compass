import { TokenPayload } from "google-auth-library";
import { google } from "googleapis";
import mergeWith from "lodash.mergewith";
import { ClientSession, ObjectId } from "mongodb";
import SupertokensUserMetadata, {
  JSONObject,
} from "supertokens-node/recipe/usermetadata";
import { BaseError } from "@core/errors/errors.base";
import { Logger } from "@core/logger/winston.logger";
import { mapUserToCompass } from "@core/mappers/map.user";
import { mapCompassUserToEmailSubscriber } from "@core/mappers/subscriber/map.subscriber";
import { UserInfo_Google } from "@core/types/auth.types";
import { CalendarProvider } from "@core/types/calendar.types";
import { Resource_Sync } from "@core/types/sync.types";
import { StringV4Schema, zObjectId } from "@core/types/type.utils";
import { Schema_User, UserMetadata } from "@core/types/user.types";
import { shouldImportGCal } from "@core/util/event/event.util";
import compassAuthService from "@backend/auth/services/compass.auth.service";
import GoogleAuthService, {
  getGcalClient,
} from "@backend/auth/services/google.auth.service";
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
import { Summary_Delete } from "@backend/user/types/user.types";

const logger = Logger("app:user.service");

class UserService {
  createGoogleUser = async (
    gUser: UserInfo_Google["gUser"],
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
      _id: createUserRes.insertedId,
    };
  };

  deleteCompassDataForUser = async (userId: ObjectId, gcalAccess = true) => {
    const summary: Summary_Delete = {};

    try {
      const priorities = await priorityService.deleteAllByUser(userId);

      summary.priorities = priorities.deletedCount;

      // delete events before calendars
      const events = await eventService.deleteAllByUser(userId);
      summary.events = events.deletedCount;

      const calendars = await calendarService.deleteAllByUser(userId);
      summary.calendars = calendars.deletedCount;

      if (gcalAccess) {
        const watches = await syncService.stopWatches(userId);
        summary.eventWatches = watches.length;
      }

      const user = await mongoService.user.findOne({ _id: userId });

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

      const { sessionsRevoked } = await compassAuthService.revokeSessionsByUser(
        userId.toString(),
      );

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

  deleteUser = async (_id: ObjectId) => {
    logger.info(`Deleting all data for user: ${_id}`);

    const response = await mongoService.user.deleteOne({ _id });

    return response;
  };

  initUserData = async (
    gUser: TokenPayload,
    gRefreshToken: string,
  ): Promise<Schema_User> => {
    const cUser = await this.createGoogleUser(gUser, gRefreshToken);
    const { userId } = cUser;
    const user = zObjectId.parse(userId);

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

    // initialize google calendars
    const gAuthClient = new GoogleAuthService();

    gAuthClient.oauthClient.setCredentials({
      refresh_token: gRefreshToken,
    });

    const gcal = google.calendar({
      version: "v3",
      auth: gAuthClient.oauthClient,
    });

    const { googleCalendars } = await calendarService.initializeGoogleCalendars(
      user,
      gcal,
    );

    const primaryGCalendar = googleCalendars.find((cal) => cal.primary);

    const primaryGCalendarId = StringV4Schema.parse(primaryGCalendar?.id, {
      error: () => "Primary Google Calendar not found",
    });

    const primaryCalendar = await calendarService.getByUserAndProvider(
      user,
      primaryGCalendarId,
      CalendarProvider.GOOGLE,
    );

    const primaryCalendarId = zObjectId.parse(primaryCalendar?._id, {
      error: () => "Primary Compass Calendar not found",
    });

    await eventService.createDefaultSomedays(user, primaryCalendarId);

    return cUser;
  };

  updateLastLoggedInTime = async (userId: ObjectId) => {
    const res = await mongoService.user.findOneAndUpdate(
      { _id: userId },
      { $set: { lastLoggedInAt: new Date() } },
      { returnDocument: "after" },
    );

    return res;
  };

  stopGoogleCalendarSync = async (
    user: ObjectId,
    session?: ClientSession,
  ): Promise<void> => {
    await eventService.deleteByIntegration(
      CalendarProvider.GOOGLE,
      user,
      session,
    );

    await syncService.stopWatches(
      user,
      undefined,
      new ObjectId().toString(),
      session,
    );

    await syncService.deleteByIntegration(
      CalendarProvider.GOOGLE,
      user.toString(),
      session,
    );
  };

  startGoogleCalendarSync = async (
    user: ObjectId,
    session?: ClientSession,
  ): Promise<void> => {
    const gcal = await getGcalClient(user);

    await calendarService.initializeGoogleCalendars(user, gcal, session);

    const calendars = await calendarService.getSelectedByUserAndProvider(
      user,
      CalendarProvider.GOOGLE,
      session,
    );

    const gCalendarIds = calendars.map(({ metadata }) => metadata.id);

    await Promise.resolve(isUsingHttps()).then((yes) =>
      yes
        ? syncService.startWatchingGcalResources(
            user,
            [
              { gCalendarId: Resource_Sync.CALENDAR },
              ...gCalendarIds.map((gCalendarId) => ({ gCalendarId })),
            ],
            gcal,
            session,
          )
        : [],
    );

    await syncService.importFull(gcal, calendars, session);
  };

  restartGoogleCalendarSync = async (
    userId: ObjectId,
    session?: ClientSession,
  ) => {
    logger.warn(`Restarting Google Calendar sync for user: ${userId}`);

    try {
      webSocketServer.handleImportGCalStart(userId.toString());

      const userMeta = await this.fetchUserMetadata(userId.toString());
      const proceed = shouldImportGCal(userMeta);

      if (!proceed) {
        webSocketServer.handleImportGCalEnd(
          userId.toString(),
          `User ${userId} gcal import is in progress or completed, ignoring this request`,
        );

        return;
      }

      await this.updateUserMetadata({
        userId: userId.toString(),
        data: { sync: { importGCal: "importing" } },
      });

      await this.stopGoogleCalendarSync(userId, session);
      await this.startGoogleCalendarSync(userId, session);

      await this.updateUserMetadata({
        userId: userId.toString(),
        data: { sync: { importGCal: "completed" } },
      });

      webSocketServer.handleImportGCalEnd(userId.toString());
      webSocketServer.handleBackgroundCalendarChange(userId.toString());
    } catch (err) {
      await this.updateUserMetadata({
        userId: userId.toString(),
        data: { sync: { importGCal: "errored" } },
      });

      logger.error(`Re-sync failed for user: ${userId}`, err);

      webSocketServer.handleImportGCalEnd(
        userId.toString(),
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
