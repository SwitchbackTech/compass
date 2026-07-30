import { invalidGrant400Error } from "../../../__tests__/mocks.gcal/errors/error.google.invalidGrant";
import { invalidValueError } from "../../../__tests__/mocks.gcal/errors/error.google.invalidValue";
import {
  isGoogleError,
  isInvalidGoogleToken,
  isInvalidValue,
} from "./gcal.utils";
import { describe, expect, it } from "bun:test";

describe("Google Error Parsing", () => {
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
});
