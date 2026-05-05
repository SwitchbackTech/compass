import { ENV } from "@backend/common/constants/env.constants";
import { AuthError } from "@backend/common/errors/auth/auth.errors";
import { error } from "@backend/common/errors/handlers/error.handler";

export const GOOGLE_AUTH_CALLBACK_PATH = "/auth/google/callback";

export function getGoogleAuthCallbackUrl(
  frontendUrl = ENV.FRONTEND_URL,
): string {
  const origin = new URL(frontendUrl).origin;
  return `${origin}${GOOGLE_AUTH_CALLBACK_PATH}`;
}

export function assertGoogleRedirectUri(
  redirectUri: string,
  frontendUrl = ENV.FRONTEND_URL,
): void {
  if (redirectUri !== getGoogleAuthCallbackUrl(frontendUrl)) {
    throw error(
      AuthError.GoogleRedirectUriMismatch,
      "Google code exchange failed",
    );
  }
}
