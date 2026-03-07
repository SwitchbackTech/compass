import { createGoogleError } from "../../../__tests__/mocks.gcal/errors/error.google.factory";
import { invalidGrant400Error } from "../../../__tests__/mocks.gcal/errors/error.google.invalidGrant";
import { invalidValueError } from "../../../__tests__/mocks.gcal/errors/error.google.invalidValue";
import { invalidSyncTokenError } from "../../../__tests__/mocks.gcal/errors/error.invalidSyncToken";
import {
  getEmailFromUrl,
  getGoogleErrorStatus,
  isFullSyncRequired,
  isGoogleError,
  isInvalidGoogleToken,
  isInvalidValue,
} from "./gcal.utils";

describe("Google Error Parsing", () => {
  it("recognizes invalid sync token error", () => {
    expect(isFullSyncRequired(invalidSyncTokenError)).toBe(true);
  });
  it("recognizes invalid (sync)value error", () => {
    expect(isInvalidValue(invalidValueError)).toBe(true);
  });
  it("recognizes expired refresh token", () => {
    expect(isInvalidGoogleToken(invalidGrant400Error)).toBe(true);
  });
  it("recognizes GaxiosError-like objects by structure", () => {
    // Simulates errors from google-auth-library that have GaxiosError shape
    // but don't pass instanceof checks due to module version differences
    const gaxiosLikeError = {
      message: "invalid_grant",
      code: 400,
      status: 400,
      config: { method: "POST", url: "https://oauth2.googleapis.com/token" },
      response: {
        status: 400,
        data: { error: "invalid_grant", error_description: "Token revoked" },
      },
    };
    expect(isGoogleError(gaxiosLikeError)).toBe(true);
    expect(isInvalidGoogleToken(gaxiosLikeError)).toBe(true);
  });
  it("recognizes invalid_grant with numeric code", () => {
    const errorWithNumericCode = {
      message: "invalid_grant",
      code: 400, // number, not string
      config: { method: "POST" },
      response: {
        status: 400,
        data: { error: "invalid_grant" },
      },
    };
    expect(isInvalidGoogleToken(errorWithNumericCode)).toBe(true);
  });
  it("returns response status when present", () => {
    expect(
      getGoogleErrorStatus(
        createGoogleError({ code: "500", responseStatus: 401 }),
      ),
    ).toBe(401);
  });
  it("falls back to the parsed gaxios code", () => {
    expect(getGoogleErrorStatus(createGoogleError({ code: "410" }))).toBe(410);
  });
  it("returns undefined for non-google errors", () => {
    expect(getGoogleErrorStatus(new Error("nope"))).toBeUndefined();
  });
});

describe("Gaxios response parsing", () => {
  it("returns email with @", () => {
    const url =
      "https://www.googleapis.com/calendar/v3/calendars/foo%40bar.com/events?syncToken=!!!!!!!!!!!!!!!jqgYQwNWZ_QyyHyycChpiZHJvaGl1aHyyyyyyymxvZmMwaXZodjN2ZxoMCO7Xj6sGEICGncADwD4B";
    expect(getEmailFromUrl(url)).toBe("foo@bar.com");
  });
});
