import { invalidGrant400Error } from "../../../__tests__/mocks.gcal/errors/error.google.invalidGrant";
import { invalidValueError } from "../../../__tests__/mocks.gcal/errors/error.google.invalidValue";
import { invalidSyncTokenError } from "../../../__tests__/mocks.gcal/errors/error.invalidSyncToken";
import {
  getEmailFromUrl,
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
});

describe("Gaxios response parsing", () => {
  it("returns email with @", () => {
    const url =
      "https://www.googleapis.com/calendar/v3/calendars/foo%40bar.com/events?syncToken=!!!!!!!!!!!!!!!jqgYQwNWZ_QyyHyycChpiZHJvaGl1aHyyyyyyymxvZmMwaXZodjN2ZxoMCO7Xj6sGEICGncADwD4B";
    expect(getEmailFromUrl(url)).toBe("foo@bar.com");
  });
});
