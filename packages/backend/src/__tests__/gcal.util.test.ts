import { invalidSyncTokenError } from "./__mocks__/error.invalidSyncToken";
import { invalidValueError } from "./__mocks__/error.google.invalidValue";
import { invalidGrant400Error } from "./__mocks__/error.google.invalidGrant";
import {
  getEmailFromUrl,
  isFullSyncRequired,
  isInvalidGoogleToken,
  isInvalidValue,
} from "../common/services/gcal/gcal.utils";

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
});

describe("Gaxios response parsing", () => {
  it("returns email with @", () => {
    const url =
      "https://www.googleapis.com/calendar/v3/calendars/foo%40bar.com/events?syncToken=!!!!!!!!!!!!!!!jqgYQwNWZ_QyyHyycChpiZHJvaGl1aHyyyyyyymxvZmMwaXZodjN2ZxoMCO7Xj6sGEICGncADwD4B";
    expect(getEmailFromUrl(url)).toBe("foo@bar.com");
  });
});
