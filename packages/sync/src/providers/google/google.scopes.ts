// Individual scope URLs, named so a consumer that cares about one specific
// scope (e.g. deriving capabilities from granted scopes) can reference it
// without re-declaring the URL string.
export const GOOGLE_SCOPE_USERINFO_EMAIL =
  "https://www.googleapis.com/auth/userinfo.email";
export const GOOGLE_SCOPE_CALENDAR_READONLY =
  "https://www.googleapis.com/auth/calendar.readonly";
export const GOOGLE_SCOPE_CALENDAR_EVENTS =
  "https://www.googleapis.com/auth/calendar.events";

// Scopes Sync requests from Google. These mirror the Compass API's existing
// Google integration so a user's granted consent covers both. Email identifies
// the account; the calendar scopes cover read and event read/write.
export const GOOGLE_SCOPES: readonly string[] = [
  GOOGLE_SCOPE_USERINFO_EMAIL,
  GOOGLE_SCOPE_CALENDAR_READONLY,
  GOOGLE_SCOPE_CALENDAR_EVENTS,
];
