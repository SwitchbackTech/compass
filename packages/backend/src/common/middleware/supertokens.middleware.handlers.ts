import supertokens from "supertokens-node";
import Session from "supertokens-node/recipe/session";
import { type SessionContainerInterface } from "supertokens-node/recipe/session/types";
import { type RecipeInterface as ThirdPartyRecipeInterface } from "supertokens-node/recipe/thirdparty/types";
import { NodeEnv } from "@core/constants/core.constants";
import { Logger } from "@core/logger/winston.logger";
import { zObjectId } from "@core/types/type.utils";
import googleAuthService from "@backend/auth/services/google/google.auth.service";
import { type GoogleSignInSuccess } from "@backend/auth/services/google/google.auth.types";
import { ENV } from "@backend/common/constants/env.constants";
import {
  buildResetPasswordLink,
  createGoogleSignInSuccess,
  ensureExternalUserIdMapping,
  getFormFieldValue,
  maybeReplaceEmailPasswordSession,
} from "@backend/common/middleware/supertokens.middleware.util";
import EmailService from "@backend/email/email.service";
import userService from "@backend/user/services/user.service";
import {
  type CreateGoogleSignInResponse,
  type CreateGoogleUserFn,
  type CreateNewRecipeUserFn,
  type SessionSignOutPOSTFn,
  type SignInPOSTFn,
  type SignUpPOSTFn,
  type ThirdPartySignInUpInput,
  type ThirdPartySignInUpPostFn,
} from "./supertokens.middleware.types";

const logger = Logger("app:supertokens.middleware");

async function replaceSessionWithCompassUser(
  input: { options: { req: unknown; res: unknown } },
  currentSession: SessionContainerInterface,
  compassUserId: string,
) {
  const compassSession = await Session.createNewSession(
    input.options.req,
    input.options.res,
    "public",
    supertokens.convertToRecipeUserId(compassUserId),
  );

  await Session.revokeSession(currentSession.getHandle());

  return compassSession;
}

// If this Google account already maps to a Compass user, swap the temporary SuperTokens session for theirs and remap `success` (recipeUserId).
async function maybeRemapGoogleSignInToCompassSession(
  input: ThirdPartySignInUpInput,
  response: Awaited<ReturnType<ThirdPartySignInUpPostFn>>,
  success: GoogleSignInSuccess,
): Promise<{
  response: Awaited<ReturnType<ThirdPartySignInUpPostFn>>;
  success: GoogleSignInSuccess;
}> {
  const connectedCompassUserId = await userService.getCanonicalCompassUserId({
    email: success.providerUser.email,
    googleUserId: success.providerUser.sub,
  });

  if (
    input.session ||
    !connectedCompassUserId ||
    response.status !== "OK" ||
    response.session.getUserId() === connectedCompassUserId
  ) {
    return { response, success };
  }

  const session = await replaceSessionWithCompassUser(
    input,
    response.session,
    connectedCompassUserId,
  );

  const responseWithCompassSession = { ...response, session };
  const successAfterSessionRemap = createGoogleSignInSuccess(
    responseWithCompassSession as CreateGoogleSignInResponse,
  );
  if (!successAfterSessionRemap) {
    throw new Error(
      "Missing Google sign-in success after Compass session replacement",
    );
  }

  return {
    response: responseWithCompassSession,
    success: successAfterSessionRemap,
  };
}

export async function createGoogleUser(
  input: Parameters<CreateGoogleUserFn>[0],
  originalCreateGoogleUser: CreateGoogleUserFn,
): Promise<
  Awaited<ReturnType<ThirdPartyRecipeInterface["manuallyCreateOrUpdateUser"]>>
> {
  const response = await originalCreateGoogleUser(input);

  if (response.status !== "OK") {
    return response;
  }

  await ensureExternalUserIdMapping(response.recipeUserId.getAsString());

  return response;
}

export async function handleGoogleSignInUp(
  input: ThirdPartySignInUpInput,
  originalSignInUpPOST: ThirdPartySignInUpPostFn,
): Promise<Awaited<ReturnType<ThirdPartySignInUpPostFn>>> {
  const response = await originalSignInUpPOST(input);
  const success = createGoogleSignInSuccess(
    response as CreateGoogleSignInResponse,
  );

  if (!success) {
    return response;
  }

  const remapped = await maybeRemapGoogleSignInToCompassSession(
    input,
    response,
    success,
  );

  await googleAuthService.handleGoogleAuth(remapped.success);

  return remapped.response;
}

export async function sendPasswordResetEmail<
  T extends { passwordResetLink: string; user: { email: string } },
>(input: T, originalSendEmail: (input: T) => Promise<void>): Promise<void> {
  const resetLink = buildResetPasswordLink(
    input.passwordResetLink,
    ENV.FRONTEND_URL,
  );

  if (ENV.NODE_ENV === NodeEnv.Test) {
    logger.info(`Password reset link for ${input.user.email}: ${resetLink}`);
    return;
  }

  await originalSendEmail({ ...input, passwordResetLink: resetLink });
}

export async function createEmailPasswordUser(
  input: Parameters<CreateNewRecipeUserFn>[0],
  originalCreateNewRecipeUser: CreateNewRecipeUserFn,
): Promise<Awaited<ReturnType<CreateNewRecipeUserFn>>> {
  const response = await originalCreateNewRecipeUser(input);

  if (response.status !== "OK") {
    return response;
  }

  await ensureExternalUserIdMapping(response.recipeUserId.getAsString());

  return response;
}

export async function handleEmailPasswordSignUp(
  input: Parameters<SignUpPOSTFn>[0],
  originalSignUpPOST: SignUpPOSTFn,
): Promise<Awaited<ReturnType<SignUpPOSTFn>>> {
  const response = await originalSignUpPOST(input);

  if (response.status === "OK") {
    const email = getFormFieldValue(input.formFields, "email");
    const name = getFormFieldValue(input.formFields, "name");
    const userId = response.session.getUserId();

    if (email) {
      const { user, isNewUser } = await userService.upsertUserFromAuth({
        userId,
        email,
        name,
      });
      const remappedResponse = await maybeReplaceEmailPasswordSession(
        input,
        response,
        user.userId,
        replaceSessionWithCompassUser,
      );
      await EmailService.tagNewUserIfEnabled(user, isNewUser);
      return remappedResponse;
    }
  }

  return response;
}

export async function handleEmailPasswordSignIn(
  input: Parameters<SignInPOSTFn>[0],
  originalSignInPOST: SignInPOSTFn,
): Promise<Awaited<ReturnType<SignInPOSTFn>>> {
  const response = await originalSignInPOST(input);

  if (response.status === "OK") {
    const email = getFormFieldValue(input.formFields, "email");
    const userId = response.session.getUserId();

    if (email) {
      const { user } = await userService.upsertUserFromAuth({ userId, email });
      return maybeReplaceEmailPasswordSession(
        input,
        response,
        user.userId,
        replaceSessionWithCompassUser,
      );
    }
  }

  return response;
}

export async function handleSessionSignOut(
  input: Parameters<SessionSignOutPOSTFn>[0],
  originalSignOutPOST: SessionSignOutPOSTFn,
): Promise<Awaited<ReturnType<SessionSignOutPOSTFn>>> {
  const userId = zObjectId.parse(input.session.getUserId());

  const userSessions = await Session.getAllSessionHandlesForUser(
    userId.toString(),
  );

  const lastActiveSession = userSessions.length < 2;

  const res = await originalSignOutPOST(input);

  try {
    await userService.handleLogoutCleanup(userId.toString(), {
      isLastActiveSession: lastActiveSession,
    });
  } catch (error) {
    logger.error(`Failed logout cleanup for user: ${userId.toString()}`, error);
  }

  return res;
}
