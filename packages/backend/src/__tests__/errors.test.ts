import { invalidSyncTokenError } from "./__mocks__/error.invalidSyncToken";
import { invalidValueError } from "./__mocks__/error.google.invalidValue";
import {
  isFullSyncRequired,
  isInvalidValue,
} from "../common/services/gcal/gcal.utils";

describe("Google Error Parsing", () => {
  it("recognizes invalid sync token error", () => {
    expect(isFullSyncRequired(invalidSyncTokenError)).toBe(true);
  });
  it("recognizes invalid (sync)value error", () => {
    expect(isInvalidValue(invalidValueError)).toBe(true);
  });
});
