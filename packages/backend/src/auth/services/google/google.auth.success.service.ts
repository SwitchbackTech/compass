import { type Credentials, type TokenPayload } from "google-auth-library";

export type GoogleSignInSuccess = {
  providerUser: TokenPayload;
  oAuthTokens: Pick<Credentials, "refresh_token" | "access_token">;
  createdNewRecipeUser: boolean;
  recipeUserId: string;
  loginMethodsLength: number;
  sessionUserId: string | null;
};

export interface GoogleSignInSuccessAuthService {
  reconnectGoogleForSession(
    sessionUserId: string,
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
    sessionUserId,
  } = success;

  if (sessionUserId !== null) {
    await authService.reconnectGoogleForSession(
      sessionUserId,
      providerUser,
      oAuthTokens,
    );
    return;
  }

  const isNewUser = createdNewRecipeUser && loginMethodsLength === 1;

  if (isNewUser) {
    const refreshToken = oAuthTokens.refresh_token;
    if (!refreshToken) {
      throw new Error("Refresh token expected for new user sign-up");
    }
    await authService.googleSignup(providerUser, refreshToken, recipeUserId);
    return;
  }

  await authService.googleSignin(providerUser, oAuthTokens);
}
