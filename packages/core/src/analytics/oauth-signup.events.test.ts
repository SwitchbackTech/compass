import {
  oauthFailedReasonFromCallbackQuery,
  oauthFailedReasonFromProviderError,
} from "@core/analytics/oauth-signup.events";
import { describe, expect, it } from "bun:test";

describe("oauth-signup.events", () => {
  it("maps provider errors", () => {
    expect(oauthFailedReasonFromProviderError("access_denied")).toBe(
      "access_denied",
    );
    expect(oauthFailedReasonFromProviderError("server_error")).toBe("other");
  });

  it("derives callback failure reasons from query params", () => {
    expect(
      oauthFailedReasonFromCallbackQuery({
        state: "x",
        code: null,
        providerError: null,
      }),
    ).toBe("missing_code");
    expect(
      oauthFailedReasonFromCallbackQuery({
        state: null,
        code: "abc",
        providerError: null,
      }),
    ).toBe("invalid_state");
  });
});
