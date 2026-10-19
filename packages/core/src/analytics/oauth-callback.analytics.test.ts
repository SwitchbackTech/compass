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

  it("maps token exchange failures to token_exchange_error", () => {
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
      reason: "token_exchange_error",
      provider_error: "exchangeFailed",
    });
  });
});
