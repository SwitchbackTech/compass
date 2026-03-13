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
  /**
   * @deprecated This field is transitional. Auth mode is now determined
   * server-side based on refresh token presence and sync health.
   * Will be removed once frontend stops sending googleAuthIntent.
   */
  sessionUserId: string | null;
};

/**
 * Auth modes for Google sign-in flow:
 * - signup: New user, no linked Compass account
 * - signin_incremental: Existing user with valid refresh token and healthy sync
 * - reconnect_repair: Existing user needing repair (missing refresh token or unhealthy sync)
 */
export type AuthMode = "signup" | "signin_incremental" | "reconnect_repair";

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
 * - If no linked Compass user exists → signup
 * - If user exists but refresh token is missing OR sync is unhealthy → reconnect_repair
 * - Otherwise → signin_incremental
 */
async function determineAuthMode(
  googleUserId: string,
  createdNewRecipeUser: boolean,
): Promise<AuthDecision> {
  // Look up existing user by Google ID
  const user = await findCompassUserBy("google.googleId", googleUserId);

  if (!user) {
    return {
      authMode: "signup",
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
      authMode: "reconnect_repair",
      compassUserId,
      hasStoredRefreshToken,
      hasHealthySync,
      createdNewRecipeUser,
    };
  }

  return {
    authMode: "signin_incremental",
    compassUserId,
    hasStoredRefreshToken,
    hasHealthySync,
    createdNewRecipeUser,
  };
}

/**
 * Logs the auth decision for observability.
 */
function logAuthDecision(
  decision: AuthDecision,
  hasSession: boolean,
  googleUserId: string,
): void {
  logger.info("Google auth decision", {
    auth_mode: decision.authMode,
    created_new_recipe_user: decision.createdNewRecipeUser,
    has_stored_refresh_token: decision.hasStoredRefreshToken,
    has_healthy_sync: decision.hasHealthySync,
    has_session: hasSession,
    compass_user_id: decision.compassUserId,
    google_user_id: googleUserId,
  });
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
    sessionUserId,
  } = success;

  const googleUserId = providerUser.sub;
  if (!googleUserId) {
    throw new Error("Google user ID (sub) is required");
  }

  // Determine auth mode based on server-side state
  const decision = await determineAuthMode(googleUserId, createdNewRecipeUser);

  // Log the decision for observability
  logAuthDecision(decision, sessionUserId !== null, googleUserId);

  switch (decision.authMode) {
    case "signup": {
      const isNewUser = createdNewRecipeUser && loginMethodsLength === 1;
      if (!isNewUser) {
        // Edge case: no Compass user found but SuperTokens says not new
        // This shouldn't happen in normal flow, treat as signup
        logger.warn("No Compass user found but createdNewRecipeUser is false", {
          google_user_id: googleUserId,
          recipe_user_id: recipeUserId,
        });
      }
      const refreshToken = oAuthTokens.refresh_token;
      if (!refreshToken) {
        throw new Error("Refresh token expected for new user sign-up");
      }
      await authService.googleSignup(providerUser, refreshToken, recipeUserId);
      return;
    }

    case "reconnect_repair": {
      // User exists but needs repair (missing refresh token or unhealthy sync)
      await authService.repairGoogleConnection(
        decision.compassUserId!,
        providerUser,
        oAuthTokens,
      );
      return;
    }

    case "signin_incremental": {
      // Healthy returning user - attempt incremental sync
      await authService.googleSignin(providerUser, oAuthTokens);
      return;
    }
  }
}
