import {
  CONTACTS_FEATURE_SCOPES,
  MICROSOFT_SCOPE_CALENDARS_READWRITE,
  MICROSOFT_SCOPE_PEOPLE_READ,
  MICROSOFT_SCOPES,
} from "@core/providers/microsoft.scopes";
import { type ProviderCapability } from "@core/types/sync/identity.contracts";

export {
  CONTACTS_FEATURE_SCOPES,
  MICROSOFT_SCOPE_CALENDARS_READWRITE,
  MICROSOFT_SCOPE_PEOPLE_READ,
  MICROSOFT_SCOPES,
  microsoftScopesForFeatures,
} from "@core/providers/microsoft.scopes";

// Derive connection capabilities from the scopes Microsoft actually granted
// (which may be a subset of those requested). Calendars.ReadWrite covers read,
// write, push subscriptions, and delta sync; People.Read covers suggestions.
export function microsoftCapabilitiesFromScopes(
  scopes: readonly string[],
): ProviderCapability[] {
  const granted = new Set(scopes);
  const capabilities: ProviderCapability[] = [];

  if (granted.has(MICROSOFT_SCOPE_CALENDARS_READWRITE)) {
    capabilities.push(
      "readEvents",
      "readBusy",
      "changeNotifications",
      "incrementalChanges",
      "writeEvents",
      "inviteAttendees",
    );
  }
  if (granted.has(MICROSOFT_SCOPE_PEOPLE_READ)) {
    capabilities.push("suggestContacts");
  }

  return capabilities;
}

export const MICROSOFT_PROVIDER_CAPABILITIES: readonly ProviderCapability[] =
  microsoftCapabilitiesFromScopes([
    ...MICROSOFT_SCOPES,
    ...CONTACTS_FEATURE_SCOPES,
  ]);
