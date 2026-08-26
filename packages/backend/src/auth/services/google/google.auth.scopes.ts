// Keep the scopes configured for SuperTokens and the scopes persisted in Sync
// together. The browser independently verifies that Google granted this set
// before it sends its authorization code to Compass.
//
// This is the REQUIRED list: sign-in fails without every scope in it. It must
// stay in lockstep with the web's GOOGLE_AUTH_SCOPES_REQUIRED and the e2e
// REQUIRED_SCOPES list, and it must NEVER gain a contacts scope — contacts are
// optional (see GOOGLE_AUTH_SCOPES_OPTIONAL below), and requiring one would
// brick sign-in for every user who declines it.
export const GOOGLE_AUTH_SCOPES: string[] = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
];

// Optional scopes the consent screen ASKS for but sign-in never requires. The
// user can leave them unchecked and proceed; whatever Google actually granted
// is persisted per connection and drives capabilities (e.g. suggestContacts)
// downstream. Approved as optional sensitive scopes 2026-08-25.
export const GOOGLE_AUTH_SCOPES_OPTIONAL: string[] = [
  "https://www.googleapis.com/auth/contacts.readonly",
  "https://www.googleapis.com/auth/contacts.other.readonly",
];

// What the sign-in flow REQUESTS from Google: every required scope plus the
// optional ones. Only ever used to build the consent request — required-scope
// validation stays on GOOGLE_AUTH_SCOPES alone.
export const GOOGLE_AUTH_SCOPES_REQUESTED: string[] = [
  ...GOOGLE_AUTH_SCOPES,
  ...GOOGLE_AUTH_SCOPES_OPTIONAL,
];
