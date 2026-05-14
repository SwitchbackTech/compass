import { CONFIG } from "@backend/common/constants/config.constants";
import { AuthError } from "@backend/common/errors/auth/auth.errors";
import { error } from "@backend/common/errors/handlers/error.handler";

export const GOOGLE_AUTH_CALLBACK_PATH = "/auth/google/callback";

export function getGoogleAuthCallbackUrl(
  frontendUrl = CONFIG.FRONTEND_URL,
): string {
  const origin = new URL(frontendUrl).origin;
  return `${origin}${GOOGLE_AUTH_CALLBACK_PATH}`;
}

export function assertGoogleRedirectUri(
  redirectUri: string,
  frontendUrl = CONFIG.FRONTEND_URL,
): void {
  if (redirectUri !== getGoogleAuthCallbackUrl(frontendUrl)) {
    throw error(
      AuthError.GoogleRedirectUriMismatch,
      "Google code exchange failed",
    );
  }
}
