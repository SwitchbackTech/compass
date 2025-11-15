import { Credentials, TokenPayload } from "google-auth-library";
import supertokens from "supertokens-node";
import Session from "supertokens-node/recipe/session";
import { Logger } from "@core/logger/winston.logger";
import { mapCompassUserToEmailSubscriber } from "@core/mappers/subscriber/map.subscriber";
import { StringV4Schema, zObjectId } from "@core/types/type.utils";
import GoogleAuthService from "@backend/auth/services/google.auth.service";
import { ENV } from "@backend/common/constants/env.constants";
import { isMissingUserTagId } from "@backend/common/constants/env.util";
import { error } from "@backend/common/errors/handlers/error.handler";
import { SyncError } from "@backend/common/errors/sync/sync.errors";
import mongoService from "@backend/common/services/mongo.service";
import EmailService from "@backend/email/email.service";
import syncService from "@backend/sync/services/sync.service";
import { getSync } from "@backend/sync/util/sync.queries";
import { canDoIncrementalSync } from "@backend/sync/util/sync.util";
import { findCompassUserBy } from "@backend/user/queries/user.queries";
import userMetadataService from "@backend/user/services/user-metadata.service";
import userService from "@backend/user/services/user.service";

const logger = Logger("app:auth.service");

class CompassAuthService {
  determineAuthMethod = async (gUserId: string) => {
    const user = await findCompassUserBy("google.googleId", gUserId);

    if (!user) {
      return { authMethod: "signup", user: null };
    }
    const userId = user._id.toString();

    const sync = await getSync({ userId });
    if (!sync) {
      throw error(
        SyncError.NoSyncRecordForUser,
        "Did not verify sync record for user",
      );
    }

    const canLogin = canDoIncrementalSync(sync);
    const authMethod = user && canLogin ? "login" : "signup";

    return { authMethod, user };
  };

  createSessionForUser = async (cUserId: string) => {
    const userId = cUserId;
    const sUserId = supertokens.convertToRecipeUserId(cUserId);

    try {
      const session = await Session.createNewSessionWithoutRequestResponse(
        "public",
        sUserId,
      );
      const accessToken = session.getAccessToken();
      logger.info(`user session created for ${userId}`);
      return {
        sessionHandle: session.getHandle(),
        userId: sUserId,
        compassUserId: userId,
        accessToken,
      };
    } catch (err) {
      logger.error("Error creating session:", err);
      throw new Error("Failed to create session");
    }
  };

  revokeSessionsByUser = async (userId: string) => {
    const sessionsRevoked = await Session.revokeAllSessionsForUser(userId);
    return { sessionsRevoked: sessionsRevoked.length };
  };

  async googleSignup(
    gUser: TokenPayload,
    refreshToken: string,
    userId: string,
  ) {
    const session = await mongoService.startSession();

    const user = await session.withTransaction(async (session) => {
      const cUser = await userService.initUserData(
        gUser,
        refreshToken,
        userId,
        session,
      );

      await userMetadataService.updateUserMetadata({
        userId,
        data: {
          skipOnboarding: false,
          sync: { importGCal: "restart", incrementalGCalSync: "restart" },
        },
      });

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

      userService.restartGoogleCalendarSync(cUser.userId).catch((err) => {
        logger.error(
          `Something went wrong with starting calendar sync for user ${cUser.userId}`,
          err,
        );
      });

      return { cUserId: cUser.userId };
    });

    return user;
  }

  async googleSignin(
    gUser: TokenPayload,
    oAuthTokens: Pick<Credentials, "refresh_token" | "access_token">,
  ) {
    const gUserId = StringV4Schema.parse(gUser.sub, {
      error: () => "Invalid Google user ID",
    });

    const refreshToken = StringV4Schema.parse(oAuthTokens.refresh_token, {
      error: () => "Invalid or missing Google refresh token",
    });

    const user = await mongoService.user.findOneAndUpdate(
      { "google.googleId": gUserId },
      {
        $set: {
          "google.gRefreshToken": refreshToken,
          lastLoggedInAt: new Date(),
        },
      },
      { returnDocument: "after" },
    );

    const cUserId = zObjectId
      .parse(user?._id, { error: () => "Invalid credentials" })
      .toString();

    // start incremental sync - do not await
    const gAuthClient = new GoogleAuthService();

    gAuthClient.oauthClient.setCredentials(oAuthTokens);

    const gcal = gAuthClient.getGcalClient();

    syncService.importIncremental(cUserId, gcal).catch(async (e) => {
      if (
        e instanceof Error &&
        e.message === SyncError.NoSyncToken.description
      ) {
        const message = `Resyncing google data due to missing sync for user: ${cUserId}`;

        logger.info(message);

        // mark in metadata to restart full import
        await userMetadataService.updateUserMetadata({
          userId: cUserId,
          data: { sync: { importGCal: "restart" } },
        });

        userService.restartGoogleCalendarSync(cUserId).catch((err) => {
          logger.error(
            `Something went wrong with ${message.toLowerCase()}`,
            err,
          );
        });
      } else {
        logger.error("Error during incremental sync:", e);
      }
    });

    return { cUserId };
  }
}

export default new CompassAuthService();
