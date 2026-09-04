import { type ProviderCapability } from "@core/types/sync/identity.contracts";
import {
  GOOGLE_SCOPE_CALENDAR_EVENTS as CALENDAR_EVENTS,
  GOOGLE_SCOPE_CALENDAR_READONLY as CALENDAR_READONLY,
  CONTACTS_FEATURE_SCOPES,
  GOOGLE_SCOPE_CONTACTS_OTHER_READONLY as CONTACTS_OTHER_READONLY,
  GOOGLE_SCOPE_CONTACTS_READONLY as CONTACTS_READONLY,
  GOOGLE_SCOPES,
} from "@sync/providers/google/google.scopes";

// Derive connection capabilities from the scopes Google actually granted (which
// may be a subset of those requested). Read access — plus push channels and
// incremental sync tokens, which Google supports for any calendar read — comes
// with either calendar scope; write and attendee invites require the read/write
// events scope. Capabilities are asked about downstream instead of re-checking
// raw scope strings.
export function googleCapabilitiesFromScopes(
  scopes: readonly string[],
): ProviderCapability[] {
  const granted = new Set(scopes);
  const capabilities: ProviderCapability[] = [];

  if (granted.has(CALENDAR_EVENTS) || granted.has(CALENDAR_READONLY)) {
    capabilities.push(
      "readEvents",
      "readBusy",
      "changeNotifications",
      "incrementalChanges",
    );
  }
  if (granted.has(CALENDAR_EVENTS)) {
    capabilities.push("writeEvents", "inviteAttendees");
  }
  // Contacts scopes are optional and independently declinable; either one is
  // enough to serve suggestions from the surface it covers (the adapter only
  // queries the People surfaces the granted scopes actually allow).
  if (granted.has(CONTACTS_READONLY) || granted.has(CONTACTS_OTHER_READONLY)) {
    capabilities.push("suggestContacts");
  }

  return capabilities;
}

export const GOOGLE_PROVIDER_CAPABILITIES: readonly ProviderCapability[] =
  googleCapabilitiesFromScopes([...GOOGLE_SCOPES, ...CONTACTS_FEATURE_SCOPES]);
