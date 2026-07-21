import { googleCapabilitiesFromScopes } from "@sync/providers/google/google-capabilities";

const EMAIL = "https://www.googleapis.com/auth/userinfo.email";
const READONLY = "https://www.googleapis.com/auth/calendar.readonly";
const EVENTS = "https://www.googleapis.com/auth/calendar.events";

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
});
