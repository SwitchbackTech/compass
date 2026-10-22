import {
  buildSignInOAuthState,
  parseSignInOAuthState,
  posthogDistinctIdFromSignInOAuthState,
} from "@core/auth/signin-oauth-state.util";
import { DESKTOP_OAUTH_STATE_PREFIX } from "@core/desktop/desktop-oauth-state.util";
import { describe, expect, it } from "bun:test";

describe("signin-oauth-state", () => {
  it("round-trips posthog distinct id for web sign-in", () => {
    const state = buildSignInOAuthState({
      isDesktopClient: false,
      posthogDistinctId: "anon-123",
    });
    expect(parseSignInOAuthState(state)).toEqual({
      rawState: state,
      nonce: expect.any(String),
      posthogDistinctId: "anon-123",
      flow: "login",
      isDesktop: false,
    });
  });

  it("prefixes desktop sign-in state", () => {
    const state = buildSignInOAuthState({
      isDesktopClient: true,
      posthogDistinctId: "anon-desktop",
    });
    expect(state.startsWith(DESKTOP_OAUTH_STATE_PREFIX)).toBe(true);
    expect(parseSignInOAuthState(state)?.isDesktop).toBe(true);
    expect(parseSignInOAuthState(state)?.posthogDistinctId).toBe(
      "anon-desktop",
    );
  });

  it("parses legacy uuid-only state", () => {
    const legacy = "550e8400-e29b-41d4-a716-446655440000";
    expect(parseSignInOAuthState(legacy)).toEqual({
      rawState: legacy,
      nonce: legacy,
      flow: "login",
      isDesktop: false,
    });
    expect(posthogDistinctIdFromSignInOAuthState(legacy)).toBeUndefined();
  });
});
