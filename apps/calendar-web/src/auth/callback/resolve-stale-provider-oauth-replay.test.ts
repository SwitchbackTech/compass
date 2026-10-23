import { resolveStaleProviderOAuthReplay } from "@web/auth/callback/resolve-stale-provider-oauth-replay";
import { setAuthSessionAuthenticated } from "@web/auth/compass/session/auth-session.store";
import { writeProviderAuthorizationIntent } from "@web/auth/providers/authorization/provider-authorization.storage";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

describe("resolveStaleProviderOAuthReplay", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    setAuthSessionAuthenticated(false);
  });

  it("returns null when there is no session", async () => {
    await expect(
      resolveStaleProviderOAuthReplay({
        provider: "google",
        search: "?state=used&code=auth-code",
        hasSession: mock(async () => false),
      }),
    ).resolves.toBeNull();
  });

  it("returns null when a saved intent is still present", async () => {
    writeProviderAuthorizationIntent("google", "fresh-state", {
      intent: "signIn",
      returnPath: "/week",
      createdAt: Date.now(),
    });

    await expect(
      resolveStaleProviderOAuthReplay({
        provider: "google",
        search: "?state=fresh-state&code=auth-code",
        hasSession: mock(async () => true),
      }),
    ).resolves.toBeNull();
  });

  it("treats the in-memory session flag as signed in", async () => {
    setAuthSessionAuthenticated(true);

    await expect(
      resolveStaleProviderOAuthReplay({
        provider: "google",
        search: "?state=consumed&code=auth-code",
      }),
    ).resolves.toBe("/week");
  });

  it("returns the default calendar route for a replayed callback", async () => {
    await expect(
      resolveStaleProviderOAuthReplay({
        provider: "microsoft",
        search: "?state=consumed&code=auth-code",
        hasSession: mock(async () => true),
      }),
    ).resolves.toBe("/week");
  });

  it("returns the default calendar route for a stripped callback revisit", async () => {
    await expect(
      resolveStaleProviderOAuthReplay({
        provider: "google",
        search: "",
        pathname: "/auth/google/callback",
        hasSession: mock(async () => true),
      }),
    ).resolves.toBe("/week");
  });
});
