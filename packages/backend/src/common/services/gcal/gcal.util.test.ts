import { createGoogleError } from "../../../__tests__/mocks.gcal/errors/error.google.factory";
import { invalidGrant400Error } from "../../../__tests__/mocks.gcal/errors/error.google.invalidGrant";
import { invalidValueError } from "../../../__tests__/mocks.gcal/errors/error.google.invalidValue";
import { invalidSyncTokenError } from "../../../__tests__/mocks.gcal/errors/error.invalidSyncToken";
import {
  getEmailFromUrl,
  getGoogleErrorStatus,
  isFullSyncRequired,
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
