import { googleCapabilitiesFromScopes } from "@sync/providers/google/google-capabilities";

const EMAIL = "https://www.googleapis.com/auth/userinfo.email";
const READONLY = "https://www.googleapis.com/auth/calendar.readonly";
const EVENTS = "https://www.googleapis.com/auth/calendar.events";
const CONTACTS = "https://www.googleapis.com/auth/contacts.readonly";
const CONTACTS_OTHER =
  "https://www.googleapis.com/auth/contacts.other.readonly";

describe("googleCapabilitiesFromScopes", () => {
  it("grants full read+write capabilities for the events scope", () => {
    expect(googleCapabilitiesFromScopes([EMAIL, EVENTS]).sort()).toEqual(
      [
        "changeNotifications",
        "incrementalChanges",
        "inviteAttendees",
        "readBusy",
        "readEvents",
        "writeEvents",
      ].sort(),
    );
  });

  it("grants read-only capabilities for the readonly scope", () => {
    expect(googleCapabilitiesFromScopes([EMAIL, READONLY]).sort()).toEqual(
      [
        "changeNotifications",
        "incrementalChanges",
        "readBusy",
        "readEvents",
      ].sort(),
    );
    // No write or invite without the events scope.
    expect(googleCapabilitiesFromScopes([READONLY])).not.toContain(
      "writeEvents",
    );
  });

  it("grants nothing when no calendar scope was granted", () => {
    expect(googleCapabilitiesFromScopes([EMAIL])).toEqual([]);
    expect(googleCapabilitiesFromScopes([])).toEqual([]);
  });

  it("produces a unique set even if both calendar scopes are present", () => {
    const caps = googleCapabilitiesFromScopes([READONLY, EVENTS]);
    expect(new Set(caps).size).toBe(caps.length);
    expect(caps).toContain("writeEvents");
  });

  // Contacts scopes are optional and independently declinable, so EITHER one
  // is enough for the capability — partial grants are a normal outcome of the
  // consent screen, not an error.
  it.each([
    [CONTACTS],
    [CONTACTS_OTHER],
    [CONTACTS, CONTACTS_OTHER],
  ])("grants suggestContacts from a contacts grant (%#)", (...scopes) => {
    expect(googleCapabilitiesFromScopes([EMAIL, EVENTS, ...scopes])).toContain(
      "suggestContacts",
    );
  });

  it("does not grant suggestContacts without a contacts scope", () => {
    expect(
      googleCapabilitiesFromScopes([EMAIL, READONLY, EVENTS]),
    ).not.toContain("suggestContacts");
  });

  it("grants suggestContacts independently of the calendar scopes", () => {
    // A degenerate grant with contacts but no calendar still reports the
    // contacts capability; connect-time gating on readEvents is separate.
    expect(googleCapabilitiesFromScopes([CONTACTS])).toEqual([
      "suggestContacts",
    ]);
  });
});
