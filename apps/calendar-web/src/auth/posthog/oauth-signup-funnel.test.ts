import { oauthFailedReasonFromSignupFailure } from "@web/auth/posthog/oauth-signup-funnel";
import { describe, expect, it } from "bun:test";

describe("oauth-signup-funnel", () => {
  it("maps signup failure reasons to oauth_failed reasons", () => {
    expect(oauthFailedReasonFromSignupFailure("oauth_user_cancelled")).toBe(
      "access_denied",
    );
    expect(oauthFailedReasonFromSignupFailure("oauth_missing_state")).toBe(
      "invalid_state",
    );
    expect(oauthFailedReasonFromSignupFailure("oauth_missing_code")).toBe(
      "missing_code",
    );
    expect(oauthFailedReasonFromSignupFailure("oauth_exchange_failed")).toBe(
      "token_exchange_failed",
    );
  });
});
