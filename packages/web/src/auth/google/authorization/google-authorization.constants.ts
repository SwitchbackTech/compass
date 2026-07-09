import { ROOT_ROUTES } from "@web/common/constants/routes";

export const GOOGLE_AUTH_CALLBACK_PATH = ROOT_ROUTES.GOOGLE_AUTH_CALLBACK;
export const GOOGLE_AUTH_INTENT_STORAGE_PREFIX =
  "compass.googleAuthorizationIntent";
export const GOOGLE_AUTH_INTENT_MAX_AGE_MS = 10 * 60 * 1000;

export const GOOGLE_AUTH_SCOPES_REQUIRED = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
];

export const GOOGLE_AUTHORIZATION_ERROR_MESSAGE =
  "We couldn't connect your Google account. Please try again.";
export const MISSING_GOOGLE_SCOPES_ERROR_MESSAGE =
  "Compass needs all the requested permissions to sync your calendar. Please allow them and try again.";
