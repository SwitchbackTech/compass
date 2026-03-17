import { type Credentials, type TokenPayload } from "google-auth-library";
import { Logger } from "@core/logger/winston.logger";
import { mapCompassUserToEmailSubscriber } from "@core/mappers/subscriber/map.subscriber";
import { StringV4Schema, zObjectId } from "@core/types/type.utils";
import GoogleOAuthClient from "@backend/auth/services/google/google.oauth.client";
import { ENV } from "@backend/common/constants/env.constants";
import { isMissingUserTagId } from "@backend/common/constants/env.util";
import { SyncError } from "@backend/common/errors/sync/sync.errors";
import mongoService from "@backend/common/services/mongo.service";
import EmailService from "@backend/email/email.service";
import syncService from "@backend/sync/services/sync.service";
import userMetadataService from "@backend/user/services/user-metadata.service";
import userService from "@backend/user/services/user.service";
import { parseReconnectGoogleParams } from "./google.auth.types";

const logger = Logger("app:auth.google.service");

class GoogleAuthService {
  private restartGoogleCalendarSyncInBackground = (cUserId: string) => {
    userService.restartGoogleCalendarSync(cUserId).catch((err) => {
      logger.error(
        `Something went wrong with starting calendar sync for user ${cUserId}`,
        err,
      );
    });
  };

  async googleSignup(
    gUser: TokenPayload,
    refreshToken: string,
    userId: string,
  ) {
    const session = await mongoService.startSession();

    const user = await session.withTransaction(async (transactionSession) => {
      const cUser = await userService.upsertUserFromAuth(
        {
          userId,
          email: gUser.email ?? "",
          name: gUser.name || undefined,
          locale: gUser.locale || undefined,
          google: {
            googleId: gUser.sub ?? "",
            picture: gUser.picture || "not provided",
            gRefreshToken: refreshToken,
          },
        },
        transactionSession,
      );

      await userMetadataService.updateUserMetadata({
        userId,
        data: {
          skipOnboarding: false,
          sync: { importGCal: "RESTART", incrementalGCalSync: "RESTART" },
        },
      });

      if (isMissingUserTagId()) {
        logger.warn(
          "Did not tag subscriber due to missing EMAILER_ ENV value(s)",
        );
      } else if (cUser.isNewUser) {
        const subscriber = mapCompassUserToEmailSubscriber(cUser.user);

        await EmailService.addTagToSubscriber(
          subscriber,
          ENV.EMAILER_USER_TAG_ID!,
        );
      }

      return { cUserId: cUser.user.userId };
    });

    this.restartGoogleCalendarSyncInBackground(user.cUserId);

    return user;
  }

  async repairGoogleConnection(
    compassUserId: string,
    gUser: TokenPayload,
    oAuthTokens: Pick<Credentials, "refresh_token" | "access_token">,
  ) {
    const {
      cUserId,
      gUser: validatedGUser,
      refreshToken,
    } = parseReconnectGoogleParams(compassUserId, gUser, oAuthTokens);

    await userService.reconnectGoogleCredentials(
      cUserId,
      validatedGUser,
      refreshToken,
    );

    await userMetadataService.updateUserMetadata({
      userId: cUserId,
      data: {
        sync: { importGCal: "RESTART", incrementalGCalSync: "RESTART" },
      },
    });

    this.restartGoogleCalendarSyncInBackground(cUserId);

    return { cUserId };
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
          "google.picture": gUser.picture || "not provided",
          lastLoggedInAt: new Date(),
        },
      },
      { returnDocument: "after" },
    );

    const cUserId = zObjectId
      .parse(user?._id, { error: () => "Invalid credentials" })
      .toString();

    const googleOAuthClient = new GoogleOAuthClient();
    googleOAuthClient.oauthClient.setCredentials(oAuthTokens);

    syncService
      .importIncremental(cUserId, googleOAuthClient.getGcalClient())
      .catch(async (err) => {
        if (
          err instanceof Error &&
          err.message === SyncError.NoSyncToken.description
        ) {
          logger.info(
            `Resyncing google data due to missing sync for user: ${cUserId}`,
          );

          await userMetadataService.updateUserMetadata({
            userId: cUserId,
            data: { sync: { importGCal: "RESTART" } },
          });

          this.restartGoogleCalendarSyncInBackground(cUserId);
          return;
        }

        logger.error("Error during incremental sync:", err);
      });

    return { cUserId };
  }
}

export default new GoogleAuthService();
