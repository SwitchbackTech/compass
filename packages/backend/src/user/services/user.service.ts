import { type TokenPayload } from "google-auth-library";
import { type ClientSession, ObjectId, type WithId } from "mongodb";
import { Logger } from "@core/logger/winston.logger";
import { mapUserToCompass } from "@core/mappers/map.user";
import { zObjectId } from "@core/types/type.utils";
import { type Schema_User, type UserProfile } from "@core/types/user.types";
import compassAuthService from "@backend/auth/services/compass/compass.auth.service";
import supertokensUserCleanupService from "@backend/auth/services/supertokens/supertokens.user-cleanup.service";
import calendarService from "@backend/calendar/services/calendar.service";
import { error } from "@backend/common/errors/handlers/error.handler";
import { UserError } from "@backend/common/errors/user/user.errors";
import { normalizeEmail } from "@backend/common/helpers/email.util";
import mongoService from "@backend/common/services/mongo.service";
import { toSyncPrincipal } from "@backend/common/services/sync-service/sync-principal";
import { getSyncServiceClient } from "@backend/common/services/sync-service/sync-service.factory";
import eventService from "@backend/event/services/event.service";
import { findCanonicalCompassUser } from "@backend/user/queries/user.queries";
import { type Summary_Delete } from "@backend/user/types/user.types";

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
    userId: string = new ObjectId().toString(),
    session?: ClientSession,
  ): Promise<Schema_User & { userId: string }> => {
    const _compassUser = mapUserToCompass(gUser);
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

    // Every auth path lands here, so this is the one place that can promise a
    // new account owns somewhere to write: Google discovery only creates
    // google-sourced calendars, which leaves a password-only account with
    // none at all, and syncLocalEventsToCloud needs this to be the landing
    // place for whatever the user wrote before signing up.
    //
    // New accounts only. Doing it on every sign-in would also hand one to
    // every existing Google user, who would find a calendar they never made
    // in their sidebar and an empty column in their day view.
    if (isNewUser) {
      await calendarService.ensureLocalCalendar(userId, session);
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

      // Events first: they are reachable only through the calendars that own
      // them, so deleting the calendars first would leave nothing to find them
      // by.
      const events = await eventService.deleteAllByUser(userId, session);
      summary.events = events.deletedCount;

      const calendars = await calendarService.deleteAllByUser(userId, session);
      summary.calendars = calendars.deletedCount;

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

  /**
   * Deletes everything Compass knows about a user. Their Google Calendar data
   * itself is never touched. Provider grant revocation happens inside Sync's
   * principal purge, which revokes EVERY connection's credential - the legacy
   * single-slot revoke here could only ever cover the last-written account.
   * Sync principal purge is fail-open: a Sync outage must not strand an
   * undeleted Compass account.
   */
  deleteAccount = async (userId: string): Promise<Summary_Delete> => {
    const summary = await this.deleteCompassDataForUser(userId);

    await this.#purgeSyncPrincipal(userId);

    return summary;
  };

  #purgeSyncPrincipal = async (userId: string): Promise<void> => {
    const client = getSyncServiceClient();
    const result = await client.purgePrincipal(toSyncPrincipal(userId));
    if (!result.ok) {
      logger.warn(
        `Sync principal purge failed (${result.error.kind}, correlation=${result.error.correlationId}); continuing anyway`,
      );
    }
  };

  // Update the user's Google profile facts (identity id, picture) and stamp
  // the sign-in. Credentials are deliberately NOT stored here - Sync's
  // credential store is the single authority (see adoptConnection).
  refreshGoogleProfile = async (
    cUserId: string,
    gUser: TokenPayload,
  ): Promise<WithId<Schema_User>> => {
    const user = await mongoService.user.findOneAndUpdate(
      { _id: zObjectId.parse(cUserId) },
      {
        $set: {
          "google.googleId": gUser.sub ?? "",
          "google.picture": gUser.picture ?? "",
          lastLoggedInAt: new Date(),
        },
        // The legacy single-slot credential; nothing reads it anymore, and
        // leaving a stale token behind is worse than clearing it.
        $unset: { "google.gRefreshToken": "" },
      },
      { returnDocument: "after" },
    );

    zObjectId.parse(user?._id, { error: () => "Invalid credentials" });
    return user as WithId<Schema_User>;
  };

  /**
   * Records that `userId`'s client is actively connected right now (called
   * on every SSE (re)connect). This is what the watch-maintenance activity
   * gate (A40) reads to tell an active user apart from an abandoned account,
   * since post-cutover EventRecords carry no `user`/`origin` field to query
   * instead. Callers fire this off without awaiting/blocking on it.
   */
  touchLastSeenAt = async (userId: string): Promise<void> => {
    await mongoService.user.updateOne(
      { _id: zObjectId.parse(userId) },
      { $set: { lastSeenAt: new Date() } },
    );
  };
}

export default new UserService();
