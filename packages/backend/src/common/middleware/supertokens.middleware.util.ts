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
