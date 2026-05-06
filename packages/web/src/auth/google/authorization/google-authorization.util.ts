import { type GoogleAuthCodeRequest } from "@core/types/auth.types";
import { GOOGLE_AUTH_CALLBACK_PATH } from "./google-authorization.constants";

export function buildGoogleAuthCallbackUrl(origin = window.location.origin) {
  return `${origin}${GOOGLE_AUTH_CALLBACK_PATH}`;
}

export function getSafeGoogleAuthReturnPath(
  href = window.location.href,
  origin = window.location.origin,
): string {
  try {
    const url = new URL(href, origin);

    if (url.origin !== origin) {
      return "/day";
    }

    if (url.pathname === GOOGLE_AUTH_CALLBACK_PATH) {
      return "/day";
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/day";
  }
}

export function buildGoogleAuthCodePayload({
  code,
  scope,
  state,
  redirectUri = buildGoogleAuthCallbackUrl(),
}: {
  code: string;
  scope?: string;
  state?: string;
  redirectUri?: string;
}): GoogleAuthCodeRequest {
  return {
    thirdPartyId: "google",
    clientType: "web",
    redirectURIInfo: {
      redirectURIOnProviderDashboard: redirectUri,
      redirectURIQueryParams: { code, scope, state },
    },
  };
}
