import { type Credentials, type TokenPayload } from "google-auth-library";
import { ObjectId } from "mongodb";
import { createUserIdMapping, getUserIdMapping } from "supertokens-node";
import type { SessionContainerInterface } from "supertokens-node/recipe/session/types";
import type { APIInterface } from "supertokens-node/recipe/thirdparty/types";
import { type GoogleSignInSuccess } from "@backend/auth/services/google/google.auth.types";

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
  session?: SessionContainerInterface;
};

export type ThirdPartySignInUpInput = Parameters<ThirdPartySignInUpPost>[0];
export type CreateGoogleSignInResponse =
  | { status: Exclude<ThirdPartySignInUpResponse["status"], "OK"> }
  | GoogleThirdPartySignInUpSuccess;
export type AuthFormField = { id: string; value: unknown };

export function getFormFieldValue(
  formFields: AuthFormField[],
  id: string,
): string | undefined {
  const field = formFields.find((item) => item.id === id);
  return typeof field?.value === "string" ? field.value : undefined;
}

function buildFrontendAuthLink(
  originalLink: string,
  frontendUrl: string,
  authView: "reset" | "verify",
): string {
  const url = new URL(originalLink);
  const token = url.searchParams.get("token");

  if (!token) {
    return originalLink;
  }

  const appUrl = new URL(`${frontendUrl}/day`);
  appUrl.searchParams.set("auth", authView);
  appUrl.searchParams.set("token", token);

  return appUrl.toString();
}

export function buildResetPasswordLink(
  passwordResetLink: string,
  frontendUrl: string,
): string {
  return buildFrontendAuthLink(passwordResetLink, frontendUrl, "reset");
}

export function buildEmailVerificationLink(
  emailVerificationLink: string,
  frontendUrl: string,
): string {
  return buildFrontendAuthLink(emailVerificationLink, frontendUrl, "verify");
}

export async function ensureExternalUserIdMapping(
  recipeUserId: string,
): Promise<string> {
  const existingMapping = await getUserIdMapping({
    userId: recipeUserId,
    userIdType: "SUPERTOKENS",
  });

  if (existingMapping.status === "OK") {
    return existingMapping.externalUserId;
  }

  const externalUserId = new ObjectId().toString();
  await createUserIdMapping({
    superTokensUserId: recipeUserId,
    externalUserId,
  });

  return externalUserId;
}

export function createGoogleSignInSuccess(
  response: CreateGoogleSignInResponse,
): GoogleSignInSuccess | null {
  if (response.status !== "OK") return null;

  return {
    providerUser: response.rawUserInfoFromProvider.fromIdTokenPayload,
    oAuthTokens: response.oAuthTokens,
    createdNewRecipeUser: response.createdNewRecipeUser,
    recipeUserId: response.session?.getUserId() ?? response.user.id,
    loginMethodsLength: response.user.loginMethods.length,
  };
}
