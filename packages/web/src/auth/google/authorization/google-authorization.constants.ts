import { ROOT_ROUTES } from "@web/common/constants/routes";

export const GOOGLE_AUTH_CALLBACK_PATH = ROOT_ROUTES.GOOGLE_AUTH_CALLBACK;
export const GOOGLE_AUTH_INTENT_STORAGE_PREFIX =
  "compass.googleAuthorizationIntent";
export const GOOGLE_AUTH_INTENT_MAX_AGE_MS = 10 * 60 * 1000;

// Sign-in fails without every scope in this list (complete-google-authorization
// verifies the callback granted them all). It must NEVER gain a contacts scope:
// contacts are optional (below), and requiring one would brick sign-in for
// every user who declines it.
export const GOOGLE_AUTH_SCOPES_REQUIRED = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
];

// Contacts are requested only by the explicit contacts feature flow in Sync.
// Keeping sign-in to the verified Calendar scopes prevents Google from
// treating the login request as unverified.
export const GOOGLE_AUTH_SCOPES_REQUESTED = GOOGLE_AUTH_SCOPES_REQUIRED;

export const GOOGLE_AUTHORIZATION_ERROR_MESSAGE =
  "We couldn't connect your Google account. Please try again.";
export const MISSING_GOOGLE_SCOPES_ERROR_MESSAGE =
  "Compass needs all the requested permissions to sync your calendar. Please allow them and try again.";
