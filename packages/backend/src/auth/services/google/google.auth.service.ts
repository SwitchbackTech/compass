import { type Credentials, type TokenPayload } from "google-auth-library";
import { Logger } from "@core/logger/winston.logger";
import { type GoogleAuthCodeRequest } from "@core/types/auth.types";
import { StringV4Schema, zObjectId } from "@core/types/type.utils";
import GoogleOAuthClient from "@backend/auth/services/google/clients/google.oauth.client";
import {
  determineGoogleAuthMode,
  parseReconnectGoogleParams,
} from "@backend/auth/services/google/util/google.auth.util";
import { CONFIG } from "@backend/common/constants/config.constants";
import { AuthError } from "@backend/common/errors/auth/auth.errors";
import { error } from "@backend/common/errors/handlers/error.handler";
import { SyncError } from "@backend/common/errors/sync/sync.errors";
import { UserError } from "@backend/common/errors/user/user.errors";
import { normalizeEmail } from "@backend/common/helpers/email.util";
import mongoService from "@backend/common/services/mongo.service";
import EmailService from "@backend/email/email.service";
import { googleCalendarSyncService } from "@backend/sync/services/google-sync/google-sync.service";
import { findCompassUserBy } from "@backend/user/queries/user.queries";
import userService from "@backend/user/services/user.service";
import userMetadataService from "@backend/user/services/user-metadata.service";
import {
  type AuthDecision,
  type GoogleSignInSuccess,
} from "./google.auth.types";
import { createHmac } from "node:crypto";

const logger = Logger("app:auth.google.service");
const AUTH_TRACE_ID_LENGTH = 16;

// Keep auth traces searchable without putting raw user identifiers in production logs.
function getTraceId(value: string | null | undefined): string | undefined {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    return undefined;
  }

  return createHmac("sha256", CONFIG.TOKEN_COMPASS_SYNC)
    .update(normalizedValue)
    .digest("hex")
    .slice(0, AUTH_TRACE_ID_LENGTH);
}

function getGoogleAuthDecisionTrace({
  createdNewRecipeUser,
  decision,
  googleUserId,
  loginMethodsLength,
  providerEmail,
}: {
  createdNewRecipeUser: boolean;
  decision: AuthDecision;
  googleUserId: string;
  loginMethodsLength: number;
  providerEmail: string | null | undefined;
}) {
  const providerEmailTraceId = providerEmail
    ? getTraceId(normalizeEmail(providerEmail))
    : undefined;
  const googleUserTraceId = getTraceId(googleUserId);
  const compassUserTraceId = getTraceId(decision.compassUserId);

  return {
    event: "google_auth_decision",
    authMode: decision.authMode,
    createdNewRecipeUser,
    hasCompassUserId: Boolean(decision.compassUserId),
    hasGoogleUserId: Boolean(googleUserId),
    hasHealthySync: decision.hasHealthySync,
    hasProviderEmail: Boolean(providerEmail),
    hasStoredRefreshToken: decision.hasStoredRefreshToken,
    loginMethodsLength,
    ...(compassUserTraceId ? { compassUserTraceId } : {}),
    ...(googleUserTraceId ? { googleUserTraceId } : {}),
    ...(providerEmailTraceId ? { providerEmailTraceId } : {}),
  };
}

async function persistGoogleConnection(
  compassUserId: string,
  gUser: TokenPayload,
  refreshToken: string,
) {
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

  startGoogleCalendarSyncIfNeededInBackground(compassUserId);

  return { cUserId: compassUserId };
}

async function persistStoredGoogleConnection(
  compassUserId: string,
  gUser: TokenPayload,
) {
  const cUserId = zObjectId.parse(compassUserId).toString();
  StringV4Schema.parse(gUser.sub, {
    error: () => "Invalid Google user ID",
  });

  const existingUser = await findCompassUserBy("_id", cUserId);

  if (!existingUser?.google?.gRefreshToken) {
    throw error(
      UserError.MissingGoogleRefreshToken,
      "User has not connected Google Calendar",
    );
  }

  await userService.refreshGoogleProfile(cUserId, gUser);

  await userMetadataService.updateUserMetadata({
    userId: cUserId,
    data: {
      sync: { importGCal: "RESTART", incrementalGCalSync: "RESTART" },
    },
  });

  startGoogleCalendarSyncIfNeededInBackground(cUserId);

  return { cUserId };
}

function startGoogleCalendarSyncIfNeededInBackground(cUserId: string) {
  googleCalendarSyncService
    .startGoogleCalendarSyncIfNeeded(cUserId)
    .catch((err) => {
      logger.error(
        `Something went wrong with starting calendar sync for user ${cUserId}`,
        err,
      );
    });
}

async function googleSignup(
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
      userId: cUser.user.userId,
      data: {
        skipOnboarding: false,
        sync: { importGCal: "RESTART", incrementalGCalSync: "RESTART" },
      },
    });

    await EmailService.tagNewUserIfEnabled(cUser.user, cUser.isNewUser);

    return { cUserId: cUser.user.userId };
  });

  startGoogleCalendarSyncIfNeededInBackground(user.cUserId);

  return user;
}

async function repairGoogleConnection(
  compassUserId: string,
  gUser: TokenPayload,
  oAuthTokens: Pick<Credentials, "refresh_token" | "access_token">,
) {
  if (!oAuthTokens.refresh_token) {
    return persistStoredGoogleConnection(compassUserId, gUser);
  }

  const {
    cUserId,
    gUser: validatedGUser,
    refreshToken,
  } = parseReconnectGoogleParams(compassUserId, gUser, oAuthTokens);

  return persistGoogleConnection(cUserId, validatedGUser, refreshToken);
}

async function getConnectedCompassUserId(
  googleUserId: string | null | undefined,
): Promise<string | null> {
  if (!googleUserId) {
    return null;
  }

  const user = await findCompassUserBy("google.googleId", googleUserId);
  return user?._id.toString() ?? null;
}

async function connectGoogleToCurrentUser(
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
  const existingCompassUserId =
    await googleAuthService.getConnectedCompassUserId(validatedGUser.sub);

  if (existingCompassUserId && existingCompassUserId !== cUserId) {
    throw error(AuthError.GoogleAccountAlreadyConnected, "User not connected");
  }

  const currentUser = await findCompassUserBy("_id", cUserId);

  if (!currentUser) {
    throw error(UserError.UserNotFound, "User not connected");
  }

  if (
    !validatedGUser.email ||
    normalizeEmail(validatedGUser.email) !== normalizeEmail(currentUser.email)
  ) {
    throw error(AuthError.GoogleConnectEmailMismatch, "User not connected");
  }

  return persistGoogleConnection(cUserId, validatedGUser, refreshToken);
}

async function googleSignin(
  gUser: TokenPayload,
  oAuthTokens: Pick<Credentials, "refresh_token" | "access_token">,
) {
  const gUserId = StringV4Schema.parse(gUser.sub, {
    error: () => "Invalid Google user ID",
  });
  const refreshToken = oAuthTokens.refresh_token
    ? StringV4Schema.parse(oAuthTokens.refresh_token, {
        error: () => "Invalid or missing Google refresh token",
      })
    : undefined;
  const update: Record<string, unknown> = {
    "google.picture": gUser.picture || "not provided",
    lastLoggedInAt: new Date(),
  };

  if (refreshToken) {
    update["google.gRefreshToken"] = refreshToken;
  }

  const user = await mongoService.user.findOneAndUpdate(
    { "google.googleId": gUserId },
    { $set: update },
    { returnDocument: "after" },
  );

  const cUserId = zObjectId
    .parse(user?._id, { error: () => "Invalid credentials" })
    .toString();

  const googleOAuthClient = new GoogleOAuthClient();
  googleOAuthClient.oauthClient.setCredentials(oAuthTokens);

  googleCalendarSyncService
    .importLatestGoogleCalendarChanges(
      cUserId,
      googleOAuthClient.getGcalClient(),
    )
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

        startGoogleCalendarSyncIfNeededInBackground(cUserId);
        return;
      }

      logger.error("Error during incremental sync:", err);
    });

  return { cUserId };
}

async function handleGoogleAuth(success: GoogleSignInSuccess): Promise<void> {
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
    providerUser.email,
    createdNewRecipeUser,
  );

  logger.info(
    "google_auth_decision",
    getGoogleAuthDecisionTrace({
      createdNewRecipeUser,
      decision,
      googleUserId,
      loginMethodsLength,
      providerEmail: providerUser.email,
    }),
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

      await googleAuthService.googleSignup(
        providerUser,
        refreshToken,
        recipeUserId,
      );
      return;
    }

    case "RECONNECT_REPAIR": {
      // User exists but needs repair (missing refresh token or unhealthy sync)
      const compassUserId = decision.compassUserId;
      if (!compassUserId) {
        throw new Error("Compass user ID expected for Google repair");
      }

      await googleAuthService.repairGoogleConnection(
        compassUserId,
        providerUser,
        oAuthTokens,
      );
      return;
    }

    case "SIGNIN_INCREMENTAL": {
      // Healthy returning user - attempt incremental sync
      await googleAuthService.googleSignin(providerUser, oAuthTokens);
      return;
    }
  }
}

export const googleAuthService = {
  googleSignup,
  repairGoogleConnection,
  getConnectedCompassUserId,
  connectGoogleToCurrentUser,
  googleSignin,
  handleGoogleAuth,
};
