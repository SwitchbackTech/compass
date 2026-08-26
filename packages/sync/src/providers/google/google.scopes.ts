// Individual scope URLs, named so a consumer that cares about one specific
// scope (e.g. deriving capabilities from granted scopes) can reference it
// without re-declaring the URL string.
export const GOOGLE_SCOPE_USERINFO_EMAIL =
  "https://www.googleapis.com/auth/userinfo.email";
export const GOOGLE_SCOPE_CALENDAR_READONLY =
  "https://www.googleapis.com/auth/calendar.readonly";
export const GOOGLE_SCOPE_CALENDAR_EVENTS =
  "https://www.googleapis.com/auth/calendar.events";
// The user's saved contacts (People API people.searchContacts).
export const GOOGLE_SCOPE_CONTACTS_READONLY =
  "https://www.googleapis.com/auth/contacts.readonly";
// "Other contacts" — addresses the user has interacted with but never saved
// (People API otherContacts.search).
export const GOOGLE_SCOPE_CONTACTS_OTHER_READONLY =
  "https://www.googleapis.com/auth/contacts.other.readonly";

// Scopes Sync requests from Google. These mirror the Compass API's existing
// Google integration so a user's granted consent covers both. Email identifies
// the account; the calendar scopes cover read and event read/write.
//
// This is the BASE list every connect flow requests. The contacts scopes are
// deliberately NOT here: they are optional feature scopes (below), added to a
// consent URL only when the caller asks for the feature, and never required
// for a connection to work.
export const GOOGLE_SCOPES: readonly string[] = [
  GOOGLE_SCOPE_USERINFO_EMAIL,
  GOOGLE_SCOPE_CALENDAR_READONLY,
  GOOGLE_SCOPE_CALENDAR_EVENTS,
];

// Optional scopes backing attendee contact suggestions. Requested only when a
// connect/reconnect begins with the "contacts" feature; the user can decline
// either or both (partial grants are normal) and the connection still works —
// capabilities are derived from what was actually granted.
export const CONTACTS_FEATURE_SCOPES: readonly string[] = [
  GOOGLE_SCOPE_CONTACTS_READONLY,
  GOOGLE_SCOPE_CONTACTS_OTHER_READONLY,
];
