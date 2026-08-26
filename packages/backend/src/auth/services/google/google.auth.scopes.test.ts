import {
  GOOGLE_AUTH_SCOPES,
  GOOGLE_AUTH_SCOPES_OPTIONAL,
  GOOGLE_AUTH_SCOPES_REQUESTED,
} from "@backend/auth/services/google/google.auth.scopes";
import { describe, expect, it } from "bun:test";

describe("google auth scopes", () => {
  // GOOGLE_AUTH_SCOPES is the REQUIRED list: sign-in validation
  // (grantedGoogleScopes) fails without every scope in it, so a contacts
  // scope here would brick sign-in for everyone who declines it. The literal
  // pin is the regression guard for WP-05's core promise: the required list
  // did not change.
  it("keeps the required list unchanged — no contacts scope, ever", () => {
    expect(GOOGLE_AUTH_SCOPES).toEqual([
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.events",
    ]);
    for (const scope of GOOGLE_AUTH_SCOPES) {
      expect(scope).not.toContain("contacts");
    }
  });

  it("requests the contacts scopes only as optional additions", () => {
    expect(GOOGLE_AUTH_SCOPES_OPTIONAL).toEqual([
      "https://www.googleapis.com/auth/contacts.readonly",
      "https://www.googleapis.com/auth/contacts.other.readonly",
    ]);
    expect(GOOGLE_AUTH_SCOPES_REQUESTED).toEqual([
      ...GOOGLE_AUTH_SCOPES,
      ...GOOGLE_AUTH_SCOPES_OPTIONAL,
    ]);
    // No optional scope may leak into the required list.
    for (const scope of GOOGLE_AUTH_SCOPES_OPTIONAL) {
      expect(GOOGLE_AUTH_SCOPES).not.toContain(scope);
    }
  });
});
