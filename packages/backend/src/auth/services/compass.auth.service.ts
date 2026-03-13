import { type Credentials, type TokenPayload } from "google-auth-library";
import supertokens from "supertokens-node";
import Session from "supertokens-node/recipe/session";
import { Logger } from "@core/logger/winston.logger";
import { mapCompassUserToEmailSubscriber } from "@core/mappers/subscriber/map.subscriber";
import { StringV4Schema, zObjectId } from "@core/types/type.utils";
import { parseReconnectGoogleParams } from "@backend/auth/schemas/reconnect-google.schemas";
import GoogleAuthService from "@backend/auth/services/google/google.auth.service";
import {
  type GoogleAuthDecision,
  type GoogleSignInSuccess,
} from "@backend/auth/services/google/google.auth.success.service";
import { ENV } from "@backend/common/constants/env.constants";
import { isMissingUserTagId } from "@backend/common/constants/env.util";
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
  private restartGoogleCalendarSyncInBackground = (cUserId: string) => {
    userService.restartGoogleCalendarSync(cUserId).catch((err) => {
      logger.error(
        `Something went wrong with starting calendar sync for user ${cUserId}`,
        err,
      );
    });
  };

  private assessGoogleConnection = async (userId: string) => {
    const user = await findCompassUserBy("_id", userId);

    if (!user) {
      throw new Error(
        `Could not resolve Compass user for Google auth: ${userId}`,
      );
    }

    const hasStoredRefreshTokenBefore = Boolean(user.google?.gRefreshToken);
    const sync = await getSync({ userId });
    const isIncrementalReady = Boolean(sync && canDoIncrementalSync(sync));
    const googleMetadata =
      await userMetadataService.assessGoogleMetadata(userId);
    const isHealthy =
      googleMetadata.connectionStatus === "connected" &&
      googleMetadata.syncStatus === "healthy";

    return {
      hasStoredRefreshTokenBefore,
      isIncrementalReady,
      isHealthy,
      needsRepair:
        !hasStoredRefreshTokenBefore || !isIncrementalReady || !isHealthy,
    };
  };

  determineGoogleAuthMode = async (
    success: GoogleSignInSuccess,
  ): Promise<GoogleAuthDecision> => {
    const {
      createdNewRecipeUser,
      loginMethodsLength,
      providerUser,
      recipeUserId,
      sessionUserId,
    } = success;
    const isNewUser = createdNewRecipeUser && loginMethodsLength === 1;

    if (isNewUser) {
      return {
        authMode: "signup",
        cUserId: recipeUserId,
        hasStoredRefreshTokenBefore: false,
        hasSession: sessionUserId !== null,
        isReconnectRepair: false,
      };
    }

    const googleUserId = StringV4Schema.parse(providerUser.sub, {
      error: () => "Invalid Google user ID",
    });
    const existingUser =
      (await findCompassUserBy("_id", recipeUserId)) ??
      (await findCompassUserBy("google.googleId", googleUserId));

    if (!existingUser) {
      throw new Error(
        `Could not resolve Compass user for Google auth: ${recipeUserId}`,
      );
    }

    const cUserId = existingUser._id.toString();
    const assessment = await this.assessGoogleConnection(cUserId);

    return {
      authMode: assessment.needsRepair
        ? "reconnect_repair"
        : "signin_incremental",
      cUserId,
      hasStoredRefreshTokenBefore: assessment.hasStoredRefreshTokenBefore,
      hasSession: sessionUserId !== null,
      isReconnectRepair: assessment.needsRepair,
    };
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

      return { cUserId: cUser.userId };
    });

    // Fire-and-forget: full calendar import can exceed MongoDB transaction timeout (60s)
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
        sync: { importGCal: "restart", incrementalGCalSync: "restart" },
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
          lastLoggedInAt: new Date(),
        },
      },
      { returnDocument: "after" },
    );

    const cUserId = zObjectId
      .parse(user?._id, { error: () => "Invalid credentials" })
      .toString();
    const assessment = await this.assessGoogleConnection(cUserId);

    if (assessment.needsRepair) {
      await userMetadataService.updateUserMetadata({
        userId: cUserId,
        data: {
          sync: { importGCal: "restart", incrementalGCalSync: "restart" },
        },
      });

      this.restartGoogleCalendarSyncInBackground(cUserId);

      return { cUserId };
    }

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

        this.restartGoogleCalendarSyncInBackground(cUserId);
      } else {
        logger.error("Error during incremental sync:", e);
      }
    });

    return { cUserId };
  }
}

export default new CompassAuthService();
