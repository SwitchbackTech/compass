import { ObjectId } from "mongodb";
import { createUserIdMapping, getUserIdMapping } from "supertokens-node";
import { type SessionContainerInterface } from "supertokens-node/recipe/session/types";
import { type GoogleSignInSuccess } from "@backend/auth/services/google/google.auth.types";
import {
  type AuthFormField,
  type CreateGoogleSignInResponse,
  type EmailPasswordAuthInput,
  type EmailPasswordAuthResponse,
} from "./supertokens.middleware.types";

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

export async function maybeReplaceEmailPasswordSession(
  input: EmailPasswordAuthInput,
  response: EmailPasswordAuthResponse,
  compassUserId: string,
  replaceSession: (
    input: EmailPasswordAuthInput,
    currentSession: SessionContainerInterface,
    compassUserId: string,
  ) => Promise<SessionContainerInterface>,
): Promise<EmailPasswordAuthResponse> {
  if (response.session.getUserId() === compassUserId) {
    return response;
  }

  const session = await replaceSession(input, response.session, compassUserId);

  return { ...response, session };
}
