import { type Credentials, type TokenPayload } from "google-auth-library";
import { Logger } from "@core/logger/winston.logger";
import { getSync } from "@backend/sync/util/sync.queries";
import { canDoIncrementalSync } from "@backend/sync/util/sync.util";
import { findCompassUserBy } from "@backend/user/queries/user.queries";

const logger = Logger("app:google.auth.success");

export type GoogleSignInSuccess = {
  providerUser: TokenPayload;
  oAuthTokens: Pick<Credentials, "refresh_token" | "access_token">;
  createdNewRecipeUser: boolean;
  recipeUserId: string;
  loginMethodsLength: number;
};

/**
 * Auth modes for Google sign-in flow:
 * - SIGNUP: New user, no linked Compass account
 * - SIGNIN_INCREMENTAL: Existing user with valid refresh token and healthy sync
 * - RECONNECT_REPAIR: Existing user needing repair (missing refresh token or unhealthy sync)
 */
export type AuthMode = "SIGNUP" | "SIGNIN_INCREMENTAL" | "RECONNECT_REPAIR";

export type AuthDecision = {
  authMode: AuthMode;
  compassUserId: string | null;
  hasStoredRefreshToken: boolean;
  hasHealthySync: boolean;
  createdNewRecipeUser: boolean;
};

export interface GoogleSignInSuccessAuthService {
  repairGoogleConnection(
    compassUserId: string,
    gUser: TokenPayload,
    oAuthTokens: Pick<Credentials, "refresh_token" | "access_token">,
  ): Promise<{ cUserId: string }>;
  googleSignup(
    gUser: TokenPayload,
    refreshToken: string,
    userId: string,
  ): Promise<{ cUserId: string }>;
  googleSignin(
    gUser: TokenPayload,
    oAuthTokens: Pick<Credentials, "refresh_token" | "access_token">,
  ): Promise<{ cUserId: string }>;
}

/**
 * Determines the auth mode based on server-side state.
 *
 * Decision logic:
 * - If no linked Compass user exists → SIGNUP
 * - If user exists but refresh token is missing OR sync is unhealthy → RECONNECT_REPAIR
 * - Otherwise → SIGNIN_INCREMENTAL
 */
async function determineAuthMode(
  googleUserId: string,
  createdNewRecipeUser: boolean,
): Promise<AuthDecision> {
  // Look up existing user by Google ID
  const user = await findCompassUserBy("google.googleId", googleUserId);

  if (!user) {
    return {
      authMode: "SIGNUP",
      compassUserId: null,
      hasStoredRefreshToken: false,
      hasHealthySync: false,
      createdNewRecipeUser,
    };
  }

  const compassUserId = user._id.toString();
  const hasStoredRefreshToken = !!user.google?.gRefreshToken;

  // Check sync health
  const sync = await getSync({ userId: compassUserId });
  const hasHealthySync = sync ? !!canDoIncrementalSync(sync) : false;

  // If missing refresh token OR unhealthy sync → needs repair
  if (!hasStoredRefreshToken || !hasHealthySync) {
    return {
      authMode: "RECONNECT_REPAIR",
      compassUserId,
      hasStoredRefreshToken,
      hasHealthySync,
      createdNewRecipeUser,
    };
  }

  return {
    authMode: "SIGNIN_INCREMENTAL",
    compassUserId,
    hasStoredRefreshToken,
    hasHealthySync,
    createdNewRecipeUser,
  };
}

export async function handleGoogleAuth(
  success: GoogleSignInSuccess,
  authService: GoogleSignInSuccessAuthService,
): Promise<void> {
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
  const decision = await determineAuthMode(googleUserId, createdNewRecipeUser);

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
      await authService.googleSignup(providerUser, refreshToken, recipeUserId);
      return;
    }

    case "RECONNECT_REPAIR": {
      // User exists but needs repair (missing refresh token or unhealthy sync)
      await authService.repairGoogleConnection(
        decision.compassUserId!,
        providerUser,
        oAuthTokens,
      );
      return;
    }

    case "SIGNIN_INCREMENTAL": {
      // Healthy returning user - attempt incremental sync
      await authService.googleSignin(providerUser, oAuthTokens);
      return;
    }
  }
}
