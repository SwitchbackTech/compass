import { type Credentials, type TokenPayload } from "google-auth-library";
import type { APIInterface } from "supertokens-node/recipe/thirdparty/types";
import type { GoogleSignInSuccess } from "@backend/auth/services/google/google.auth.success.service";

type ThirdPartySignInUpPost = NonNullable<APIInterface["signInUpPOST"]>;
type ThirdPartySignInUpResponse = Awaited<ReturnType<ThirdPartySignInUpPost>>;
type ThirdPartySignInUpSuccess = Extract<
  ThirdPartySignInUpResponse,
  { status: "OK" }
>;
type GoogleThirdPartySignInUpSuccess = ThirdPartySignInUpSuccess & {
  rawUserInfoFromProvider: { fromIdTokenPayload: TokenPayload };
  oAuthTokens: Pick<Credentials, "refresh_token" | "access_token">;
  user: { id: string; loginMethods: unknown[] };
};

export type ThirdPartySignInUpInput = Parameters<ThirdPartySignInUpPost>[0];
export type CreateGoogleSignInResponse =
  | { status: Exclude<ThirdPartySignInUpResponse["status"], "OK"> }
  | GoogleThirdPartySignInUpSuccess;

/**
 * @deprecated This function is transitional. Auth mode is now determined
 * server-side in handleGoogleAuth() based on refresh token presence and
 * sync health. The googleAuthIntent is no longer authoritative for routing.
 *
 * Kept temporarily for backward compatibility during transition period.
 */
export function getGoogleAuthIntent(
  value: unknown,
): GoogleAuthIntent | undefined {
  if (value === "connect" || value === "reconnect") {
    return value;
  }

  return undefined;
}

export function createGoogleSignInSuccess(
  response: CreateGoogleSignInResponse,
): GoogleSignInSuccess | null {
  if (response.status !== "OK") return null;

  return {
    providerUser: response.rawUserInfoFromProvider.fromIdTokenPayload,
    oAuthTokens: response.oAuthTokens,
    createdNewRecipeUser: response.createdNewRecipeUser,
    recipeUserId: response.user.id,
    loginMethodsLength: response.user.loginMethods.length,
  };
}
