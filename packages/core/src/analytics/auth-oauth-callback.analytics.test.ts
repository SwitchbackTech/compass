import { authOAuthCallbackOutcomeFromQuery } from "@core/analytics/oauth-signup.events";
import { describe, expect, it } from "bun:test";

describe("auth-oauth-callback.analytics", () => {
  it("marks a code+state return as success", () => {
    expect(
      authOAuthCallbackOutcomeFromQuery({
        state: "state-token",
        code: "auth-code",
        providerError: null,
      }),
    ).toEqual({ outcome: "success" });
  });

  it("maps provider and query failures to reasons", () => {
    expect(
      authOAuthCallbackOutcomeFromQuery({
        state: "state-token",
        code: null,
        providerError: "access_denied",
      }),
    ).toEqual({ outcome: "failure", reason: "access_denied" });
    expect(
      authOAuthCallbackOutcomeFromQuery({
        state: null,
        code: "auth-code",
        providerError: null,
      }),
    ).toEqual({ outcome: "failure", reason: "invalid_state" });
  });
});
