import {
  oauthCallbackFailureReason,
  sanitizeOAuthProviderError,
} from "@core/analytics/oauth-callback.analytics";
import { describe, expect, it } from "bun:test";

describe("oauth-callback.analytics", () => {
  it("sanitizes provider errors", () => {
    expect(sanitizeOAuthProviderError("  access_denied  ")).toBe(
      "access_denied",
    );
    expect(
      sanitizeOAuthProviderError(
        "user bob@example.com failed with secret-token-abcdefghijklmnopqrstuvwxyz",
      ),
    ).toBe("user [email] failed with [redacted]");
  });

  it("maps declined consent to access_denied", () => {
    expect(
      oauthCallbackFailureReason({
        outcome: "declined",
        state: "signed-state",
        code: undefined,
        oauthError: "access_denied",
      }),
    ).toEqual({ reason: "access_denied", provider_error: "access_denied" });
  });

  it("maps missing code to missing_code", () => {
    expect(
      oauthCallbackFailureReason({
        outcome: "error",
        state: "signed-state",
        code: undefined,
        oauthError: undefined,
      }),
    ).toEqual({ reason: "missing_code" });
  });

  it("maps token exchange failures to token_exchange_failed", () => {
    expect(
      oauthCallbackFailureReason({
        outcome: "error",
        state: "signed-state",
        code: "auth-code",
        oauthError: undefined,
        exchangeError: Object.assign(new Error("exchange failed"), {
          name: "ProviderAuthError",
          reason: "exchangeFailed",
        }),
      }),
    ).toEqual({
      reason: "token_exchange_failed",
      provider_error: "exchangeFailed",
    });
  });

  it("omits provider_error when an exchange failure carries no reason", () => {
    expect(
      oauthCallbackFailureReason({
        outcome: "error",
        state: "signed-state",
        code: "auth-code",
        oauthError: undefined,
        exchangeError: Object.assign(new Error("exchange failed"), {
          name: "ProviderAuthError",
        }),
      }),
    ).toEqual({ reason: "token_exchange_failed" });
  });

  it("ignores a non-provider error on the exchange path", () => {
    expect(
      oauthCallbackFailureReason({
        outcome: "error",
        state: "signed-state",
        code: "auth-code",
        oauthError: undefined,
        exchangeError: new TypeError("unrelated"),
      }),
    ).toEqual({ reason: "other" });
  });

  it("treats a blank state or code as absent", () => {
    expect(
      oauthCallbackFailureReason({
        outcome: "error",
        state: "",
        code: "auth-code",
        oauthError: undefined,
      }),
    ).toEqual({ reason: "invalid_state" });
    expect(
      oauthCallbackFailureReason({
        outcome: "error",
        state: "signed-state",
        code: "",
        oauthError: undefined,
      }),
    ).toEqual({ reason: "missing_code" });
  });

  it("maps a state verification failure to invalid_state", () => {
    for (const stateVerifyReason of ["invalidSignature", "expired"] as const) {
      expect(
        oauthCallbackFailureReason({
          outcome: "error",
          state: "signed-state",
          code: "auth-code",
          oauthError: undefined,
          stateVerifyReason,
        }),
      ).toEqual({ reason: "invalid_state" });
    }
  });
});
