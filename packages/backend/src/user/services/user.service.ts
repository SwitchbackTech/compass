import { TokenPayload } from "google-auth-library";
import { ClientSession, ObjectId } from "mongodb";
import SupertokensUserMetadata, {
  JSONObject,
} from "supertokens-node/recipe/usermetadata";
import { Logger } from "@core/logger/winston.logger";
import { mapUserToCompass } from "@core/mappers/map.user";
import { Resource_Sync } from "@core/types/sync.types";
import { zObjectId } from "@core/types/type.utils";
import { Schema_User, UserMetadata, UserProfile } from "@core/types/user.types";
import { shouldImportGCal } from "@core/util/event/event.util";
import compassAuthService from "@backend/auth/services/compass.auth.service";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import calendarService from "@backend/calendar/services/calendar.service";
import { error } from "@backend/common/errors/handlers/error.handler";
import { UserError } from "@backend/common/errors/user/user.errors";
import { initSupertokens } from "@backend/common/middleware/supertokens.middleware";
import mongoService from "@backend/common/services/mongo.service";
import eventService from "@backend/event/services/event.service";
import priorityService from "@backend/priority/services/priority.service";
import { webSocketServer } from "@backend/servers/websocket/websocket.server";
import syncService from "@backend/sync/services/sync.service";
import { isUsingHttps } from "@backend/sync/util/sync.util";
import userMetadataService from "@backend/user/services/user-metadata.service";
import { Summary_Delete } from "@backend/user/types/user.types";

const logger = Logger("app:user.service");

class UserService {
  createUser = async (
    gUser: TokenPayload,
    gRefreshToken: string,
    userId: string = new ObjectId().toString(),
    session?: ClientSession,
  ): Promise<Schema_User & { userId: string }> => {
    const _compassUser = mapUserToCompass(gUser, gRefreshToken);
    const _id = zObjectId.parse(userId, { error: () => "Invalid user ID" });
    const compassUser = { ..._compassUser, _id, signedUpAt: new Date() };

    const user = await mongoService.user.insertOne(compassUser, { session });

    const newUserId = zObjectId.parse(user.insertedId.toString(), {
      error: () => "Failed to create Compass user",
    });

    return {
      ...compassUser,
      userId: newUserId.toString(),
    };
  };

  getProfile = async (
    _id: ObjectId,
    session?: ClientSession,
  ): Promise<UserProfile> => {
    const user = await mongoService.user.findOne(
      { _id },
      {
        session,
        projection: {
          userId: { $toString: "$_id" },
          picture: "$google.picture",
          firstName: 1,
          lastName: 1,
          name: 1,
          email: 1,
          locale: 1,
        },
      },
    );

    if (!user)
      throw error(UserError.UserNotFound, "Failed to return user profile");

    return user as unknown as UserProfile;
  };

  deleteCompassDataForUser = async (userId: string, gcalAccess = true) => {
    const _id = zObjectId.parse(userId);
    const summary: Summary_Delete = {};
    const session = await mongoService.startSession();

    const result = await session.withTransaction(async (session) => {
      const user = await mongoService.user.findOne({ _id }, { session });

      if (!user) {
        logger.warn(`User(${userId}) not found while deleting compass data`);
      }

      const priorities = await priorityService.deleteAllByUser(userId, session);
      summary.priorities = priorities.deletedCount;

      const calendars = await calendarService.deleteAllByUser(userId, session);
      summary.calendars = calendars.deletedCount;

      const events = await eventService.deleteAllByUser(userId, session);
      summary.events = events.deletedCount;

      if (gcalAccess) {
        const watches = await syncService.stopWatches(
          userId,
          undefined,
          new ObjectId().toString(),
          session,
        );
        summary.eventWatches = watches.length;
      } else {
        const watches = await mongoService.watch.deleteMany(
          { user: userId },
          { session },
        );
        summary.eventWatches = watches.deletedCount;
      }

      const syncs = await syncService.deleteAllByUser(userId, session);
      summary.syncs = syncs.deletedCount;

      if (user) {
        // delete other users sync with same Google calendar ID (email)
        const gCalId = user.email;
        const staleSyncs = await syncService.deleteAllByGcalId(gCalId, session);
        summary.syncs += staleSyncs.deletedCount;
      }

      // revoke all sessions
      initSupertokens();
      const { sessionsRevoked } = await compassAuthService
        .revokeSessionsByUser(userId)
        .catch((err) => {
          logger.error(
            `Failed to revoke sessions for user: ${userId} during data deletion`,
            err,
          );
          return { sessionsRevoked: 0 };
        });
      summary.sessions = sessionsRevoked;

      // delete user
      const userDel = await mongoService.user.deleteOne({ _id }, { session });
      summary.user = userDel.deletedCount;

      return summary;
    });

    return result;
  };

  initUserData = async (
    gUser: TokenPayload,
    gRefreshToken: string,
    userId?: string,
    session?: ClientSession,
  ) => {
    const cUser = await this.createUser(gUser, gRefreshToken, userId, session);

    await priorityService.createDefaultPriorities(cUser.userId, session);

    await eventService.createDefaultSomedays(cUser.userId, session);

    return cUser;
  };

  stopGoogleCalendarSync = async (user: string | ObjectId): Promise<void> => {
    const userId = zObjectId.parse(user).toString();

    await eventService.deleteByIntegration("google", userId);
    await syncService.stopWatches(userId);
    await syncService.deleteByIntegration("google", userId);
  };

  startGoogleCalendarSync = async (
    user: string,
  ): Promise<{ eventsCount: number; calendarsCount: number }> => {
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

    const importResults = await syncService.importFull(
      gcal,
      gCalendarIds,
      user,
    );

    const eventsCount = importResults.reduce(
      (sum, result) => sum + result.totalChanged,
      0,
    );

    return {
      eventsCount,
      calendarsCount: gCalendarIds.length,
    };
  };

  restartGoogleCalendarSync = async (
    userId: string,
    options: { force?: boolean } = {},
  ) => {
    const isForce = options.force === true;

    logger.warn(
      `Restarting Google Calendar sync for user: ${userId}${isForce ? " (forced)" : ""}`,
    );

    try {
      webSocketServer.handleImportGCalStart(userId);

      const userMeta = await userMetadataService.fetchUserMetadata(userId);
      const importStatus = userMeta.sync?.importGCal;
      const isImporting = importStatus === "importing";
      const proceed = isForce ? !isImporting : shouldImportGCal(userMeta);

      if (!proceed) {
        webSocketServer.handleImportGCalEnd(
          userId,
          `User ${userId} gcal import is in progress or completed, ignoring this request`,
        );

        return;
      }

      await userMetadataService.updateUserMetadata({
        userId,
        data: { sync: { importGCal: "importing" } },
      });

      await this.stopGoogleCalendarSync(userId);
      const importResults = await this.startGoogleCalendarSync(userId);

      await userMetadataService.updateUserMetadata({
        userId,
        data: { sync: { importGCal: "completed" } },
      });

      webSocketServer.handleImportGCalEnd(
        userId,
        JSON.stringify(importResults),
      );
      webSocketServer.handleBackgroundCalendarChange(userId);
    } catch (err) {
      await userMetadataService.updateUserMetadata({
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
