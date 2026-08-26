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

// Optional scopes the consent screen asks for but sign-in never verifies. The
// user can leave them unchecked and proceed; the backend stores whatever was
// actually granted. Approved as optional sensitive scopes 2026-08-25.
export const GOOGLE_AUTH_SCOPES_OPTIONAL = [
  "https://www.googleapis.com/auth/contacts.readonly",
  "https://www.googleapis.com/auth/contacts.other.readonly",
];

// What the sign-in flow REQUESTS from Google: required plus optional. Only for
// building the consent request — callback verification stays on
// GOOGLE_AUTH_SCOPES_REQUIRED alone.
export const GOOGLE_AUTH_SCOPES_REQUESTED = [
  ...GOOGLE_AUTH_SCOPES_REQUIRED,
  ...GOOGLE_AUTH_SCOPES_OPTIONAL,
];

export const GOOGLE_AUTHORIZATION_ERROR_MESSAGE =
  "We couldn't connect your Google account. Please try again.";
export const MISSING_GOOGLE_SCOPES_ERROR_MESSAGE =
  "Compass needs all the requested permissions to sync your calendar. Please allow them and try again.";
