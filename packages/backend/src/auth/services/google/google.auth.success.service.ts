import { type Credentials, type TokenPayload } from "google-auth-library";
import { Logger } from "@core/logger/winston.logger";
import { determineGoogleAuthMode } from "@backend/auth/services/google/google.auth.success.utils";

const logger = Logger("app:google.auth.success");

export type GoogleSignInSuccess = {
  providerUser: TokenPayload;
  oAuthTokens: Pick<Credentials, "refresh_token" | "access_token">;
  createdNewRecipeUser: boolean;
  recipeUserId: string;
  loginMethodsLength: number;
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
