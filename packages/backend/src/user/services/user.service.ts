import { type TokenPayload } from "google-auth-library";
import { type ClientSession, ObjectId, type WithId } from "mongodb";
import SupertokensUserMetadata, {
  type JSONObject,
} from "supertokens-node/recipe/usermetadata";
import { Logger } from "@core/logger/winston.logger";
import { mapUserToCompass } from "@core/mappers/map.user";
import { zObjectId } from "@core/types/type.utils";
import {
  type Schema_User,
  type UserMetadata,
  type UserProfile,
} from "@core/types/user.types";
import compassAuthService from "@backend/auth/services/compass/compass.auth.service";
import supertokensUserCleanupService from "@backend/auth/services/supertokens/supertokens.user-cleanup.service";
import calendarService from "@backend/calendar/services/calendar.service";
import { error } from "@backend/common/errors/handlers/error.handler";
import { UserError } from "@backend/common/errors/user/user.errors";
import { normalizeEmail } from "@backend/common/helpers/email.util";
import mongoService from "@backend/common/services/mongo.service";
import eventService from "@backend/event/services/event.service";
import priorityService from "@backend/priority/services/priority.service";
import syncService from "@backend/sync/services/sync.service";
import { findCanonicalCompassUser } from "@backend/user/queries/user.queries";
import userMetadataService from "@backend/user/services/user-metadata.service";
import {
  type GetUserMetadataResponse,
  type Summary_Delete,
} from "@backend/user/types/user.types";

const logger = Logger("app:user.service");

/**
 * Manages user data and metadata.
 */
class UserService {
  private splitName(name: string): { firstName: string; lastName: string } {
    const trimmedName = name.trim();
    const [firstName = "Mystery", ...rest] = trimmedName.split(/\s+/);
    const lastName = rest.join(" ") || "Person";

    return { firstName, lastName };
  }

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

    return {
      ...(user as unknown as UserProfile),
      picture: (user as { picture?: string }).picture ?? "",
    };
  };

  getCanonicalCompassUserId = async (input: {
    email?: string | null;
    googleUserId?: string | null;
  }): Promise<string | null> => {
    const user = await findCanonicalCompassUser(input);
    return user?._id.toString() ?? null;
  };

  upsertUserFromAuth = async (
    input: {
      userId: string;
      email: string;
      name?: string;
      locale?: string;
      google?: Schema_User["google"];
    },
    session?: ClientSession,
  ): Promise<{
    user: Schema_User & { userId: string };
    isNewUser: boolean;
  }> => {
    const requestedUserId = zObjectId.parse(input.userId, {
      error: () => "Invalid user ID",
    });
    const email = normalizeEmail(input.email);
    const existingUserByEmail = await mongoService.user.findOne(
      { email },
      { session },
    );
    const existingUser =
      existingUserByEmail ??
      (await mongoService.user.findOne({ _id: requestedUserId }, { session }));
    const userId = existingUser?._id ?? requestedUserId;

    const isNewUser = !existingUser;
    const name = input.name?.trim() || existingUser?.name || "Mystery Person";
    const { firstName, lastName } = this.splitName(name);
    const locale = input.locale ?? existingUser?.locale ?? "not provided";
    const signedUpAt = existingUser?.signedUpAt ?? new Date();

    // Preserve existing Google data, but allow override from input
    const google = input.google ?? existingUser?.google;

    const nextUser: Schema_User = {
      email,
      name,
      firstName,
      lastName,
      locale,
      signedUpAt,
      lastLoggedInAt: new Date(),
      ...(google ? { google } : {}),
    };

    const { signedUpAt: nextSignedUpAt, ...updatableUser } = nextUser;

    await mongoService.user.updateOne(
      { _id: userId },
      {
        $set: updatableUser,
        $setOnInsert: { signedUpAt: nextSignedUpAt },
      },
      { upsert: true, session },
    );

    if (isNewUser) {
      await priorityService.createDefaultPriorities(userId.toString(), session);
    }

    return {
      user: {
        ...nextUser,
        userId: userId.toString(),
      },
      isNewUser,
    };
  };

  deleteCompassDataForUser = async (
    userId: string,
    gcalAccess = true,
  ): Promise<Summary_Delete> => {
    const _id = zObjectId.parse(userId);
    const summary: Summary_Delete = {};
    const authCleanupTarget =
      await supertokensUserCleanupService.resolveByExternalUserId(userId);
    const session = await mongoService.startSession();

    await session.withTransaction(async (session) => {
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

      // delete user
      const userDel = await mongoService.user.deleteOne({ _id }, { session });
      summary.user = userDel.deletedCount;
    });

    const { sessionsRevoked } =
      await compassAuthService.revokeSessionsByUser(userId);
    summary.sessions = sessionsRevoked;

    const authSummary =
      await supertokensUserCleanupService.cleanupResolvedTarget(
        authCleanupTarget,
      );

    return { ...summary, ...authSummary };
  };

  initUserData = async (
    gUser: TokenPayload,
    gRefreshToken: string,
    userId?: string,
    session?: ClientSession,
  ) => {
    const cUser = await this.createUser(gUser, gRefreshToken, userId, session);

    await priorityService.createDefaultPriorities(cUser.userId, session);

    return cUser;
  };

  stopGoogleCalendarSync = async (
    user: string | ObjectId,
    options?: { skipGoogleWatchStop?: boolean },
  ): Promise<void> => {
    const userId = zObjectId.parse(user).toString();
    const skipGoogleWatchStop = options?.skipGoogleWatchStop === true;

    await eventService.deleteByIntegration("google", userId);
    if (skipGoogleWatchStop) {
      await syncService.deleteWatchesByUser(userId);
    } else {
      await syncService.stopWatches(userId);
    }
    await syncService.deleteByIntegration("google", userId);
  };

  handleLogoutCleanup = async (
    userId: string,
    options: { isLastActiveSession: boolean },
  ): Promise<void> => {
    const _id = zObjectId.parse(userId);
    const user = await mongoService.user.findOne({ _id });

    if (!user) {
      logger.warn(`User(${userId}) not found during logout cleanup`);
      return;
    }

    const hasGoogleConnection = Boolean(
      user.google?.googleId || user.google?.gRefreshToken,
    );

    if (hasGoogleConnection) {
      await userMetadataService.updateUserMetadata({
        userId,
        data: { sync: { incrementalGCalSync: "RESTART" } },
      });
    }

    if (options.isLastActiveSession) {
      await syncService.stopWatches(userId);
    }
  };

  reconnectGoogleCredentials = async (
    cUserId: string,
    gUser: TokenPayload,
    refreshToken: string,
  ): Promise<WithId<Schema_User>> => {
    const user = await mongoService.user.findOneAndUpdate(
      { _id: zObjectId.parse(cUserId) },
      {
        $set: {
          "google.googleId": gUser.sub ?? "",
          "google.picture": gUser.picture ?? "",
          "google.gRefreshToken": refreshToken,
          lastLoggedInAt: new Date(),
        },
      },
      { returnDocument: "after" },
    );

    zObjectId.parse(user?._id, { error: () => "Invalid credentials" });
    return user as WithId<Schema_User>;
  };

  pruneGoogleData = async (userId: string): Promise<void> => {
    const _id = zObjectId.parse(userId);
    await this.stopGoogleCalendarSync(userId, { skipGoogleWatchStop: true });
    await mongoService.user.updateOne(
      { _id },
      { $set: { "google.gRefreshToken": "" } },
    );
    await userMetadataService.updateUserMetadata({
      userId,
      data: {
        sync: { importGCal: "RESTART", incrementalGCalSync: "RESTART" },
      },
    });
  };

  fetchUserMetadata = async (
    userId: string,
    userContext?: Record<string, JSONObject>,
  ): Promise<UserMetadata> => {
    const { status, metadata } = (await SupertokensUserMetadata.getUserMetadata(
      userId,
      userContext,
    )) as GetUserMetadataResponse;

    if (status !== "OK") throw new Error("Failed to fetch user metadata");

    return metadata;
  };
}

export default new UserService();
