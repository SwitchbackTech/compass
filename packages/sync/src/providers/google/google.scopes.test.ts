import {
  CONTACTS_FEATURE_SCOPES,
  GOOGLE_SCOPE_CONTACTS_OTHER_READONLY,
  GOOGLE_SCOPE_CONTACTS_READONLY,
  GOOGLE_SCOPES,
} from "@sync/providers/google/google.scopes";
import { describe, expect, it } from "bun:test";

describe("google scopes", () => {
  // The base list is what EVERY connect flow requests and what the required
  // sign-in lists mirror. The literal pin is the regression guard for WP-05's
  // core promise: adding optional contacts scopes changed nothing here.
  it("keeps the base GOOGLE_SCOPES list unchanged", () => {
    expect(GOOGLE_SCOPES).toEqual([
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.events",
    ]);
  });

  it("keeps the contacts scopes OUT of the base list — they are optional", () => {
    expect(GOOGLE_SCOPES).not.toContain(GOOGLE_SCOPE_CONTACTS_READONLY);
    expect(GOOGLE_SCOPES).not.toContain(GOOGLE_SCOPE_CONTACTS_OTHER_READONLY);
  });

  it("bundles both contacts scopes into the contacts feature", () => {
    expect(CONTACTS_FEATURE_SCOPES).toEqual([
      "https://www.googleapis.com/auth/contacts.readonly",
      "https://www.googleapis.com/auth/contacts.other.readonly",
    ]);
  });
});
