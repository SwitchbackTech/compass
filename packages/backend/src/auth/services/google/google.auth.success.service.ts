import { type Credentials, type TokenPayload } from "google-auth-library";
import { Logger } from "@core/logger/winston.logger";

const logger = Logger("app:google.auth.success.service");

export type GoogleAuthMode =
  | "signup"
  | "signin_incremental"
  | "reconnect_repair";

export type GoogleAuthDecision = {
  authMode: GoogleAuthMode;
  cUserId: string | null;
  hasStoredRefreshTokenBefore: boolean;
  hasSession: boolean;
  isReconnectRepair: boolean;
};

export type GoogleSignInSuccess = {
  providerUser: TokenPayload;
  oAuthTokens: Pick<Credentials, "refresh_token" | "access_token">;
  createdNewRecipeUser: boolean;
  recipeUserId: string;
  loginMethodsLength: number;
  sessionUserId: string | null;
};

export interface GoogleSignInSuccessAuthService {
  determineGoogleAuthMode(
    success: GoogleSignInSuccess,
  ): Promise<GoogleAuthDecision>;
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
  const decision = await authService.determineGoogleAuthMode(success);

  logger.info(
    `Resolved Google auth mode: ${JSON.stringify({
      auth_mode: decision.authMode,
      createdNewRecipeUser,
      hasStoredRefreshTokenBefore: decision.hasStoredRefreshTokenBefore,
      hasSession: decision.hasSession,
      isReconnectRepair: decision.isReconnectRepair,
      recipeUserId,
      loginMethodsLength,
    })}`,
  );

  if (decision.authMode === "signup") {
    const refreshToken = oAuthTokens.refresh_token;
    if (!refreshToken) {
      throw new Error("Refresh token expected for new user sign-up");
    }
    await authService.googleSignup(providerUser, refreshToken, recipeUserId);
    return;
  }

  if (decision.authMode === "reconnect_repair") {
    if (!decision.cUserId) {
      throw new Error("Compass user ID expected for Google reconnect repair");
    }

    await authService.repairGoogleConnection(
      decision.cUserId,
      providerUser,
      oAuthTokens,
    );
    return;
  }

  await authService.googleSignin(providerUser, oAuthTokens);
}
