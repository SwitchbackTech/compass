import { buildSignInOAuthState } from "@core/auth/signin-oauth-state.util";
import {
  handleProviderOAuthCallback,
  parseProviderOAuthCallbackProvider,
} from "@backend/auth/services/provider-oauth-callback.service";
import * as analytics from "@backend/auth/services/provider-oauth-signup.analytics";
import { describe, expect, it, spyOn } from "bun:test";

describe("provider-oauth-callback.service", () => {
  it("parses supported providers", () => {
    expect(parseProviderOAuthCallbackProvider("google")).toBe("google");
    expect(parseProviderOAuthCallbackProvider("unknown")).toBeNull();
  });

  it("captures callback and failure then redirects to the SPA", () => {
    const received = spyOn(
      analytics.providerOAuthSignupAnalytics,
      "captureCallbackReceived",
    ).mockImplementation(() => undefined);
    const failed = spyOn(
      analytics.providerOAuthSignupAnalytics,
      "captureFailed",
    ).mockImplementation(() => undefined);

    const state = buildSignInOAuthState({
      isDesktopClient: false,
      posthogDistinctId: "anon-abc",
    });

    const result = handleProviderOAuthCallback({
      provider: "google",
      query: { state, error: "access_denied" },
      telemetryOnly: false,
      frontendUrl: "http://localhost:9080",
    });

    expect(received).toHaveBeenCalledWith({ provider: "google", state });
    expect(failed).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "google",
        reason: "access_denied",
        providerError: "access_denied",
      }),
    );
    expect(result).toEqual({
      mode: "redirect",
      location: expect.stringContaining(
        "http://localhost:9080/auth/google/callback",
      ),
    });

    received.mockRestore();
    failed.mockRestore();
  });

  it("returns telemetry-only without redirect", () => {
    const received = spyOn(
      analytics.providerOAuthSignupAnalytics,
      "captureCallbackReceived",
    ).mockImplementation(() => undefined);
    spyOn(
      analytics.providerOAuthSignupAnalytics,
      "captureFailed",
    ).mockImplementation(() => undefined);

    const state = buildSignInOAuthState({ isDesktopClient: false });
    const result = handleProviderOAuthCallback({
      provider: "microsoft",
      query: { state, code: "auth-code" },
      telemetryOnly: true,
    });

    expect(result).toEqual({ mode: "telemetry" });
    received.mockRestore();
  });
});
