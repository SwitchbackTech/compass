export const MICROSOFT_SCOPE_OPENID = "openid";
export const MICROSOFT_SCOPE_PROFILE = "profile";
export const MICROSOFT_SCOPE_EMAIL = "email";
export const MICROSOFT_SCOPE_OFFLINE_ACCESS = "offline_access";
export const MICROSOFT_SCOPE_USER_READ = "User.Read";
export const MICROSOFT_SCOPE_CALENDARS_READWRITE = "Calendars.ReadWrite";
export const MICROSOFT_SCOPE_PEOPLE_READ = "People.Read";

// Scopes Sync requests from Microsoft on every connect flow. Contacts are
// optional feature scopes (below), added only when the caller asks for the
// feature, and never required for a connection to work.
export const MICROSOFT_SCOPES: readonly string[] = [
  MICROSOFT_SCOPE_OPENID,
  MICROSOFT_SCOPE_PROFILE,
  MICROSOFT_SCOPE_EMAIL,
  MICROSOFT_SCOPE_OFFLINE_ACCESS,
  MICROSOFT_SCOPE_USER_READ,
  MICROSOFT_SCOPE_CALENDARS_READWRITE,
];

// Optional scope backing attendee contact suggestions. Requested only when a
// connect/reconnect begins with the "contacts" feature; the user can decline
// it and the connection still works — capabilities are derived from what was
// actually granted.
export const CONTACTS_FEATURE_SCOPES: readonly string[] = [
  MICROSOFT_SCOPE_PEOPLE_READ,
];

export function microsoftScopesForFeatures(
  features: readonly string[],
): readonly string[] {
  return features.includes("contacts") ? CONTACTS_FEATURE_SCOPES : [];
}
