import { GOOGLE_SCOPES as CORE_GOOGLE_SCOPES } from "@core/providers/google.scopes";
import {
  CONTACTS_FEATURE_SCOPES,
  GOOGLE_SCOPE_CONTACTS_OTHER_READONLY,
  GOOGLE_SCOPE_CONTACTS_READONLY,
  GOOGLE_SCOPES,
  googleScopesForFeatures,
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

  it("maps the contacts feature to the optional contacts scopes", () => {
    expect(googleScopesForFeatures(["contacts"])).toEqual(
      CONTACTS_FEATURE_SCOPES,
    );
    expect(googleScopesForFeatures([])).toEqual([]);
    expect(googleScopesForFeatures(["other"])).toEqual([]);
  });

  it("re-exports the core Google scope list", () => {
    expect(GOOGLE_SCOPES).toBe(CORE_GOOGLE_SCOPES);
  });
});
