import { type TokenPayload } from "google-auth-library";
import { type ClientSession, ObjectId, type WithId } from "mongodb";
import { Logger } from "@core/logger/winston.logger";
import { mapUserToCompass } from "@core/mappers/map.user";
import { zObjectId } from "@core/types/type.utils";
import { type Schema_User, type UserProfile } from "@core/types/user.types";
import compassAuthService from "@backend/auth/services/compass/compass.auth.service";
import supertokensUserCleanupService from "@backend/auth/services/supertokens/supertokens.user-cleanup.service";
import stripeService from "@backend/billing/services/stripe.service";
import calendarService from "@backend/calendar/services/calendar.service";
import { error } from "@backend/common/errors/handlers/error.handler";
import { UserError } from "@backend/common/errors/user/user.errors";
import { normalizeEmail } from "@backend/common/helpers/email.util";
import mongoService from "@backend/common/services/mongo.service";
import eventService from "@backend/event/services/event.service";
import { findCanonicalCompassUser } from "@backend/user/queries/user.queries";
import { syncPrincipalDeletionRetry } from "@backend/user/services/sync-principal-deletion-retry.service";
import { type Summary_Delete } from "@backend/user/types/user.types";

const logger = Logger("app:user.service");
const RECENT_AUTHENTICATION_MS = 15 * 60_000;
const ACCOUNT_DELETION_RETRY_INTERVAL_MS = 10 * 60_000;
const ACCOUNT_DELETION_RETRY_BATCH_SIZE = 100;

/**
 * Manages user data and metadata.
 */
class UserService {
  #accountDeletionRetryTimer: ReturnType<typeof setInterval> | undefined;

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
    const now = new Date();
    const compassUser = {
      ..._compassUser,
      _id,
      signedUpAt: now,
      lastLoggedInAt: now,
    };

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
        $setOnInsert: {
          signedUpAt: nextSignedUpAt,
          "billing.subscriptionStatus": "awaiting_checkout",
        },
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
    options: { queueSyncPurge?: boolean } = {},
  ): Promise<Summary_Delete> => {
    const _id = zObjectId.parse(userId);
    const summary: Summary_Delete = {};
    const authCleanupTarget =
      await supertokensUserCleanupService.resolveByExternalUserId(userId);
    const session = await mongoService.startSession();

    try {
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

        const calendars = await calendarService.deleteAllByUser(
          userId,
          session,
        );
        summary.calendars = calendars.deletedCount;

        // delete user
        const userDel = await mongoService.user.deleteOne({ _id }, { session });
        summary.user = userDel.deletedCount;

        // Commit the retry intent with the account deletion itself. If this
        // transaction succeeds, a later Sync outage cannot lose the only
        // record that tells us to revoke the user's provider credentials.
        if (options.queueSyncPurge) {
          const now = new Date();
          await mongoService.pendingSyncPrincipalDeletion.updateOne(
            { _id: userId },
            {
              $setOnInsert: {
                requestedAt: now,
                attempts: 0,
                lastAttemptAt: now,
              },
            },
            { upsert: true, session },
          );
        }
      });
    } finally {
      await session.endSession();
    }

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
   * Sync principal purge is durable: a Sync outage does not strand an
   * undeleted Compass account, and the queued principal is retried until its
   * credential/cache purge succeeds.
   */
  deleteAccount = async (userId: string): Promise<Summary_Delete> => {
    const user = await mongoService.user.findOne(
      { _id: zObjectId.parse(userId) },
      { projection: { lastLoggedInAt: 1 } },
    );
    const isRecent =
      user?.lastLoggedInAt != null &&
      Date.now() - user.lastLoggedInAt.getTime() <= RECENT_AUTHENTICATION_MS;
    if (!isRecent) {
      throw error(
        UserError.RecentAuthenticationRequired,
        "Recent authentication required to delete account",
      );
    }

    await mongoService.pendingAccountDeletion.updateOne(
      { _id: userId },
      { $setOnInsert: { createdAt: new Date() } },
      { upsert: true },
    );

    // This has to precede deletion of the user row, which is our only durable
    // Stripe customer mapping. If Stripe cannot confirm cancellation, leave
    // the account intact and ask the user to retry rather than risk a charge
    // after telling them their account has gone.
    let stripeCustomerDeleted = false;
    try {
      await stripeService.deleteCustomerForAccount(userId);
      stripeCustomerDeleted = true;
      await mongoService.pendingAccountDeletion.updateOne(
        { _id: userId },
        { $set: { stripeCustomerDeletedAt: new Date() } },
      );
    } catch (error) {
      // Stripe failed before we could establish a safe cancellation. The
      // account remains available for an explicit user retry.
      if (!stripeCustomerDeleted) {
        await mongoService.pendingAccountDeletion.deleteOne({ _id: userId });
      }
      throw error;
    }

    return this.#completePendingAccountDeletion(userId);
  };

  startAccountDeletionRetries = (): void => {
    if (this.#accountDeletionRetryTimer) return;
    void this.retryPendingAccountDeletions().catch((error) =>
      logger.error("Could not start pending account deletion retries", error),
    );
    this.#accountDeletionRetryTimer = setInterval(() => {
      void this.retryPendingAccountDeletions().catch((error) =>
        logger.error("Could not retry pending account deletions", error),
      );
    }, ACCOUNT_DELETION_RETRY_INTERVAL_MS);
  };

  stopAccountDeletionRetries = (): void => {
    if (!this.#accountDeletionRetryTimer) return;
    clearInterval(this.#accountDeletionRetryTimer);
    this.#accountDeletionRetryTimer = undefined;
  };

  retryPendingAccountDeletions = async (): Promise<void> => {
    const pending = await mongoService.pendingAccountDeletion
      .find({}, { projection: { _id: 1, stripeCustomerDeletedAt: 1 } })
      .sort({ createdAt: 1 })
      .limit(ACCOUNT_DELETION_RETRY_BATCH_SIZE)
      .toArray();

    for (const deletion of pending) {
      try {
        if (!deletion.stripeCustomerDeletedAt) {
          await stripeService.deleteCustomerForAccount(deletion._id);
          await mongoService.pendingAccountDeletion.updateOne(
            { _id: deletion._id },
            { $set: { stripeCustomerDeletedAt: new Date() } },
          );
        }
        await this.#completePendingAccountDeletion(deletion._id);
      } catch (error) {
        logger.warn("Pending account deletion will retry", error);
      }
    }
  };

  async #completePendingAccountDeletion(
    userId: string,
  ): Promise<Summary_Delete> {
    const summary = await this.deleteCompassDataForUser(userId, {
      queueSyncPurge: true,
    });
    await this.#purgeSyncPrincipal(userId);
    await mongoService.pendingAccountDeletion.deleteOne({ _id: userId });
    return summary;
  }

  #purgeSyncPrincipal = async (userId: string): Promise<void> => {
    await syncPrincipalDeletionRetry.enqueueAndAttempt(userId);
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
