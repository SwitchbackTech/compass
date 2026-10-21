import {
  oauthCallbackSearchHasParams,
  stripOAuthCallbackQueryFromHistory,
} from "@web/auth/callback/strip-oauth-callback-url";
import { afterEach, describe, expect, it } from "bun:test";

describe("stripOAuthCallbackQueryFromHistory", () => {
  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("detects provider callback query params", () => {
    expect(oauthCallbackSearchHasParams("?state=abc&code=1")).toBe(true);
    expect(oauthCallbackSearchHasParams("")).toBe(false);
  });

  it("removes callback params from the address bar", () => {
    window.history.replaceState(
      null,
      "",
      "/auth/google/callback?state=s&code=c",
    );

    stripOAuthCallbackQueryFromHistory();

    expect(window.location.pathname).toBe("/auth/google/callback");
    expect(window.location.search).toBe("");
  });
});
