import { type ProviderCapability } from "@core/types/sync/identity.contracts";

const CALENDAR_EVENTS = "https://www.googleapis.com/auth/calendar.events";
const CALENDAR_READONLY = "https://www.googleapis.com/auth/calendar.readonly";

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

  return capabilities;
}
