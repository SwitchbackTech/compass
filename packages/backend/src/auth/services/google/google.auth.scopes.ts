// Keep the scopes configured for SuperTokens and the scopes persisted in Sync
// together. The browser independently verifies that Google granted this set
// before it sends its authorization code to Compass.
export const GOOGLE_AUTH_SCOPES: string[] = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
];
