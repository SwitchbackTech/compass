import { type Credentials, type TokenPayload } from "google-auth-library";
import { Logger } from "@core/logger/winston.logger";
import { type GoogleAuthCodeRequest } from "@core/types/auth.types";
import { StringV4Schema, zObjectId } from "@core/types/type.utils";
import GoogleOAuthClient from "@backend/auth/services/google/clients/google.oauth.client";
import {
  determineGoogleAuthMode,
  parseReconnectGoogleParams,
} from "@backend/auth/services/google/util/google.auth.util";
import { AuthError } from "@backend/common/errors/auth/auth.errors";
import { error } from "@backend/common/errors/handlers/error.handler";
import { SyncError } from "@backend/common/errors/sync/sync.errors";
import mongoService from "@backend/common/services/mongo.service";
import EmailService from "@backend/email/email.service";
import { syncCompassEventsToGoogle } from "@backend/event/services/event.service";
import syncService from "@backend/sync/services/sync.service";
import { findCompassUserBy } from "@backend/user/queries/user.queries";
import userMetadataService from "@backend/user/services/user-metadata.service";
import userService from "@backend/user/services/user.service";
import { type GoogleSignInSuccess } from "./google.auth.types";

const logger = Logger("app:auth.google.service");

class GoogleAuthService {
  private persistGoogleConnection = async (
    compassUserId: string,
    gUser: TokenPayload,
    refreshToken: string,
  ) => {
    await userService.reconnectGoogleCredentials(
      compassUserId,
      gUser,
      refreshToken,
    );

    await userMetadataService.updateUserMetadata({
      userId: compassUserId,
      data: {
        sync: { importGCal: "RESTART", incrementalGCalSync: "RESTART" },
      },
    });

    this.restartGoogleCalendarSyncInBackground(compassUserId);

    return { cUserId: compassUserId };
  };

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

      await EmailService.tagNewUserIfEnabled(cUser.user, cUser.isNewUser);

      return { cUserId: cUser.user.userId };
    });

    await syncCompassEventsToGoogle(user.cUserId);
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

    return this.persistGoogleConnection(cUserId, validatedGUser, refreshToken);
  }

  async getConnectedCompassUserId(
    googleUserId: string | null | undefined,
  ): Promise<string | null> {
    if (!googleUserId) {
      return null;
    }

    const user = await findCompassUserBy("google.googleId", googleUserId);
    return user?._id.toString() ?? null;
  }

  async connectGoogleToCurrentUser(
    compassUserId: string,
    input: GoogleAuthCodeRequest,
  ) {
    const googleOAuthClient = new GoogleOAuthClient();
    const { gUser, tokens } = await googleOAuthClient.exchangeAuthCode(input);
    const {
      cUserId,
      gUser: validatedGUser,
      refreshToken,
    } = parseReconnectGoogleParams(compassUserId, gUser, tokens);

    const existingCompassUserId = await this.getConnectedCompassUserId(
      validatedGUser.sub,
    );

    if (existingCompassUserId && existingCompassUserId !== cUserId) {
      throw error(
        AuthError.GoogleAccountAlreadyConnected,
        "User not connected",
      );
    }

    return this.persistGoogleConnection(cUserId, validatedGUser, refreshToken);
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

  async handleGoogleAuth(success: GoogleSignInSuccess): Promise<void> {
    const {
      providerUser,
      oAuthTokens,
      createdNewRecipeUser,
      recipeUserId,
      loginMethodsLength,
    } = success;

    const googleUserId = providerUser.sub;
    if (!googleUserId) {
      throw new Error("Google user ID (sub) is required");
    }

    // Determine auth mode based on server-side state
    const decision = await determineGoogleAuthMode(
      googleUserId,
      createdNewRecipeUser,
    );

    switch (decision.authMode) {
      case "SIGNUP": {
        const isNewUser = createdNewRecipeUser && loginMethodsLength === 1;
        if (!isNewUser) {
          // Edge case: no Compass user found but SuperTokens says not new
          // This shouldn't happen in normal flow, treat as signup
          logger.warn("No Compass user found but isNewUser is false", {
            google_user_id: googleUserId,
            recipe_user_id: recipeUserId,
            created_new_recipe_user: createdNewRecipeUser,
            login_methods_length: loginMethodsLength,
          });
        }

        const refreshToken = oAuthTokens.refresh_token;
        if (!refreshToken) {
          throw new Error("Refresh token expected for new user sign-up");
        }

        await this.googleSignup(providerUser, refreshToken, recipeUserId);
        return;
      }

      case "RECONNECT_REPAIR": {
        // User exists but needs repair (missing refresh token or unhealthy sync)
        await this.repairGoogleConnection(
          decision.compassUserId!,
          providerUser,
          oAuthTokens,
        );
        return;
      }

      case "SIGNIN_INCREMENTAL": {
        // Healthy returning user - attempt incremental sync
        await this.googleSignin(providerUser, oAuthTokens);
        return;
      }
    }
  }
}

export default new GoogleAuthService();
