// Scopes Sync requests from Google. These mirror the Compass API's existing
// Google integration so a user's granted consent covers both. Email identifies
// the account; the calendar scopes cover read and event read/write.
export const GOOGLE_SCOPES: readonly string[] = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
];
