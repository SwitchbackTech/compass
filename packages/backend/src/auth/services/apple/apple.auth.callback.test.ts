import { Status } from "@core/errors/status.codes";
import { CONFIG } from "@backend/common/constants/config.constants";
import {
  APPLE_SIGNIN_SPA_CALLBACK_PATH,
  appleSpaCallbackUrl,
  encodeAppleOAuthState,
  resolveAppleFormPostRedirect,
} from "./apple.auth.callback";
import { describe, expect, it } from "bun:test";

describe("resolveAppleFormPostRedirect", () => {
  const frontendUrl = "http://localhost:9080";
  const spa = `${frontendUrl}${APPLE_SIGNIN_SPA_CALLBACK_PATH}`;

  it("redirects a valid SuperTokens state to the SPA callback", () => {
    const state = encodeAppleOAuthState(spa);
    const result = resolveAppleFormPostRedirect(
      { code: "auth-code", state, user: '{"name":{"firstName":"Ada"}}' },
      frontendUrl,
    );

    expect(result).toEqual({
      location: appleSpaCallbackUrl(frontendUrl, {
        code: "auth-code",
        state,
        user: '{"name":{"firstName":"Ada"}}',
      }),
    });
  });

  it("rejects a missing state", () => {
    expect(
      resolveAppleFormPostRedirect({ code: "auth-code" }, frontendUrl),
    ).toEqual({
      status: Status.BAD_REQUEST,
      message: "Sign in with Apple is missing the OAuth state",
    });
  });

  it("rejects a mismatched state", () => {
    expect(
      resolveAppleFormPostRedirect(
        { code: "auth-code", state: "not-valid-state" },
        frontendUrl,
      ),
    ).toEqual({
      status: Status.BAD_REQUEST,
      message: "Sign in with Apple returned a mismatched OAuth state",
    });

    const otherApp = encodeAppleOAuthState(
      "https://evil.example/auth/apple/callback",
    );
    expect(
      resolveAppleFormPostRedirect(
        { code: "auth-code", state: otherApp },
        frontendUrl,
      ),
    ).toEqual({
      status: Status.BAD_REQUEST,
      message: "Sign in with Apple returned a mismatched OAuth state",
    });
  });

  it("uses CONFIG.FRONTEND_URL when the caller omits an origin", () => {
    const state = encodeAppleOAuthState(
      `${CONFIG.FRONTEND_URL}${APPLE_SIGNIN_SPA_CALLBACK_PATH}`,
    );
    const result = resolveAppleFormPostRedirect({ code: "c", state });
    expect("location" in result).toBe(true);
  });
});
