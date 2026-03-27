import type {
  APIInterface as EmailPasswordAPIInterface,
  RecipeInterface as EmailPasswordRecipeInterface,
} from "supertokens-node/recipe/emailpassword/types";
import Session from "supertokens-node/recipe/session";
import type { APIInterface as SessionAPIInterface } from "supertokens-node/recipe/session/types";
import type {
  APIInterface as ThirdPartyAPIInterface,
  RecipeInterface as ThirdPartyRecipeInterface,
} from "supertokens-node/recipe/thirdparty/types";
import { NodeEnv } from "@core/constants/core.constants";
import { Logger } from "@core/logger/winston.logger";
import { zObjectId } from "@core/types/type.utils";
import googleAuthService from "@backend/auth/services/google/google.auth.service";
import { ENV } from "@backend/common/constants/env.constants";
import {
  type CreateGoogleSignInResponse,
  type ThirdPartySignInUpInput,
  buildResetPasswordLink,
  createGoogleSignInSuccess,
  ensureExternalUserIdMapping,
  getFormFieldValue,
} from "@backend/common/middleware/supertokens.middleware.util";
import EmailService from "@backend/email/email.service";
import userService from "@backend/user/services/user.service";

const logger = Logger("app:supertokens.middleware");

type ThirdPartySignInUpPostFn = NonNullable<
  ThirdPartyAPIInterface["signInUpPOST"]
>;

type CreateGoogleUserFn =
  ThirdPartyRecipeInterface["manuallyCreateOrUpdateUser"];

type CreateNewRecipeUserFn =
  EmailPasswordRecipeInterface["createNewRecipeUser"];

type SignUpPOSTFn = NonNullable<EmailPasswordAPIInterface["signUpPOST"]>;

type SignInPOSTFn = NonNullable<EmailPasswordAPIInterface["signInPOST"]>;

type SessionSignOutPOSTFn = NonNullable<SessionAPIInterface["signOutPOST"]>;

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

  if (success) {
    await googleAuthService.handleGoogleAuth(success);
  }

  return response;
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
      await EmailService.tagNewUserIfEnabled(user, isNewUser);
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
      await userService.upsertUserFromAuth({ userId, email });
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
