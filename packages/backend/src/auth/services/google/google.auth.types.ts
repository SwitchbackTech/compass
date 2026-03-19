import { type Credentials, type TokenPayload } from "google-auth-library";

export type AuthMode = "SIGNUP" | "SIGNIN_INCREMENTAL" | "RECONNECT_REPAIR";

export type AuthDecision = {
  authMode: AuthMode;
  compassUserId: string | null;
  hasStoredRefreshToken: boolean;
  hasHealthySync: boolean;
  createdNewRecipeUser: boolean;
};

export type GoogleSignInSuccess = {
  providerUser: TokenPayload;
  oAuthTokens: Pick<Credentials, "refresh_token" | "access_token">;
  createdNewRecipeUser: boolean;
  recipeUserId: string;
  loginMethodsLength: number;
};

export type ParsedReconnectGoogleParams = {
  cUserId: string;
  gUser: TokenPayload;
  refreshToken: string;
};
