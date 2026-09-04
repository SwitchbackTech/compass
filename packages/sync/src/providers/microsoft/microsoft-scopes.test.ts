import { type ProviderCapability } from "@core/types/sync/identity.contracts";
import {
  MICROSOFT_PROVIDER_CAPABILITIES,
  MICROSOFT_SCOPE_CALENDARS_READWRITE,
  MICROSOFT_SCOPE_PEOPLE_READ,
  microsoftCapabilitiesFromScopes,
  microsoftScopesForFeatures,
} from "@sync/providers/microsoft/microsoft-scopes";

describe("microsoftScopesForFeatures", () => {
  it("returns People.Read only when contacts is requested", () => {
    expect(microsoftScopesForFeatures(["contacts"])).toEqual([
      MICROSOFT_SCOPE_PEOPLE_READ,
    ]);
    expect(microsoftScopesForFeatures([])).toEqual([]);
  });
});

describe("microsoftCapabilitiesFromScopes", () => {
  it("derives calendar and contacts capabilities from granted scopes", () => {
    expect(
      microsoftCapabilitiesFromScopes([
        MICROSOFT_SCOPE_CALENDARS_READWRITE,
        MICROSOFT_SCOPE_PEOPLE_READ,
      ]),
    ).toEqual([
      "readEvents",
      "readBusy",
      "changeNotifications",
      "incrementalChanges",
      "writeEvents",
      "inviteAttendees",
      "suggestContacts",
    ] satisfies ProviderCapability[]);
  });

  it("returns no capabilities when calendar access was withheld", () => {
    expect(microsoftCapabilitiesFromScopes(["openid", "profile"])).toEqual([]);
  });

  it("matches MICROSOFT_PROVIDER_CAPABILITIES for the full scope set", () => {
    expect(MICROSOFT_PROVIDER_CAPABILITIES).toContain("readEvents");
    expect(MICROSOFT_PROVIDER_CAPABILITIES).toContain("suggestContacts");
  });
});
