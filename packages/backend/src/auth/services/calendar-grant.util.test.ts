import {
  GOOGLE_SCOPE_CALENDAR_EVENTS,
  GOOGLE_SCOPE_USERINFO_EMAIL,
} from "@core/providers/google.scopes";
import { MICROSOFT_SCOPE_CALENDARS_READWRITE } from "@core/providers/microsoft.scopes";
import {
  grantedScopesIncludeCalendarAccess,
  parseGrantedScopes,
} from "./calendar-grant.util";
import { describe, expect, it } from "bun:test";

describe("grantedScopesIncludeCalendarAccess", () => {
  it("is true when a Google or Microsoft calendar scope is present", () => {
    expect(
      grantedScopesIncludeCalendarAccess([
        GOOGLE_SCOPE_USERINFO_EMAIL,
        GOOGLE_SCOPE_CALENDAR_EVENTS,
      ]),
    ).toBe(true);
    expect(
      grantedScopesIncludeCalendarAccess([MICROSOFT_SCOPE_CALENDARS_READWRITE]),
    ).toBe(true);
  });

  it("is false for Sign in with Apple style grants", () => {
    expect(
      grantedScopesIncludeCalendarAccess(["openid", "email", "name"]),
    ).toBe(false);
    expect(grantedScopesIncludeCalendarAccess([])).toBe(false);
  });
});

describe("parseGrantedScopes", () => {
  it("splits a space-delimited scope string", () => {
    expect(parseGrantedScopes("openid email name")).toEqual([
      "openid",
      "email",
      "name",
    ]);
    expect(parseGrantedScopes(undefined)).toEqual([]);
  });
});
