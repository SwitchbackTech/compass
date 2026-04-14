import { type Credentials, type TokenPayload } from "google-auth-library";
import {
  type APIInterface as EmailPasswordAPIInterface,
  type RecipeInterface as EmailPasswordRecipeInterface,
} from "supertokens-node/recipe/emailpassword/types";
import {
  type APIInterface as SessionAPIInterface,
  type SessionContainerInterface,
} from "supertokens-node/recipe/session/types";
import {
  type APIInterface as ThirdPartyAPIInterface,
  type RecipeInterface as ThirdPartyRecipeInterface,
} from "supertokens-node/recipe/thirdparty/types";

export type ThirdPartySignInUpPostFn = NonNullable<
  ThirdPartyAPIInterface["signInUpPOST"]
>;
type ThirdPartySignInUpResponse = Awaited<ReturnType<ThirdPartySignInUpPostFn>>;
type ThirdPartySignInUpSuccess = Extract<
  ThirdPartySignInUpResponse,
  { status: "OK" }
>;
type GoogleThirdPartySignInUpSuccess = ThirdPartySignInUpSuccess & {
  rawUserInfoFromProvider: { fromIdTokenPayload: TokenPayload };
  oAuthTokens: Pick<Credentials, "refresh_token" | "access_token">;
  user: { id: string; loginMethods: unknown[] };
  session?: SessionContainerInterface;
};

export type ThirdPartySignInUpInput = Parameters<ThirdPartySignInUpPostFn>[0];
export type CreateGoogleSignInResponse =
  | { status: Exclude<ThirdPartySignInUpResponse["status"], "OK"> }
  | GoogleThirdPartySignInUpSuccess;
export type AuthFormField = { id: string; value: unknown };

export type CreateGoogleUserFn =
  ThirdPartyRecipeInterface["manuallyCreateOrUpdateUser"];

export type CreateNewRecipeUserFn =
  EmailPasswordRecipeInterface["createNewRecipeUser"];

export type SignUpPOSTFn = NonNullable<EmailPasswordAPIInterface["signUpPOST"]>;

export type SignInPOSTFn = NonNullable<EmailPasswordAPIInterface["signInPOST"]>;
export type EmailPasswordAuthInput =
  | Parameters<SignUpPOSTFn>[0]
  | Parameters<SignInPOSTFn>[0];
export type EmailPasswordAuthResponse = Extract<
  Awaited<ReturnType<SignUpPOSTFn>> | Awaited<ReturnType<SignInPOSTFn>>,
  { status: "OK" }
>;

export type SessionSignOutPOSTFn = NonNullable<
  SessionAPIInterface["signOutPOST"]
>;
