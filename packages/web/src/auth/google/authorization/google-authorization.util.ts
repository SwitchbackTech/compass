import { type GoogleAuthCodeRequest } from "@core/types/auth.types";
import { DEFAULT_CALENDAR_ROUTE } from "@web/common/constants/routes";
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
      return DEFAULT_CALENDAR_ROUTE;
    }

    if (url.pathname === GOOGLE_AUTH_CALLBACK_PATH) {
      return DEFAULT_CALENDAR_ROUTE;
    }

    // Drop the transient auth-modal params so the OAuth round-trip doesn't
    // navigate back into an open login modal on top of the authenticated
    // calendar. See the auth modal, which reopens on any `?auth=` param.
    url.searchParams.delete("auth");
    url.searchParams.delete("token");

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_CALENDAR_ROUTE;
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
