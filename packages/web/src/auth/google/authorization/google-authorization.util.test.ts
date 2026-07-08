import {
  buildGoogleAuthCallbackUrl,
  buildGoogleAuthCodePayload,
  getSafeGoogleAuthReturnPath,
} from "./google-authorization.util";
import { describe, expect, it } from "bun:test";

describe("google-authorization.util", () => {
  it("builds the callback URL from the current origin", () => {
    expect(buildGoogleAuthCallbackUrl("http://localhost:9080")).toBe(
      "http://localhost:9080/auth/google/callback",
    );
  });

  it("keeps same-origin app paths as return paths", () => {
    expect(
      getSafeGoogleAuthReturnPath(
        "http://localhost:9080/day/2026-05-05?x=1#agenda",
        "http://localhost:9080",
      ),
    ).toBe("/day/2026-05-05?x=1#agenda");
  });

  it("strips transient auth-modal params but keeps other params", () => {
    expect(
      getSafeGoogleAuthReturnPath(
        "http://localhost:9080/week/2026-07-08?auth=login&token=abc&x=1",
        "http://localhost:9080",
      ),
    ).toBe("/week/2026-07-08?x=1");
  });

  it("falls back to /day for external return paths", () => {
    expect(
      getSafeGoogleAuthReturnPath(
        "https://evil.example/phish",
        "http://localhost:9080",
      ),
    ).toBe("/day");
  });

  it("builds the existing auth-code payload shape", () => {
    expect(
      buildGoogleAuthCodePayload({
        code: "auth-code",
        scope: "email profile",
        state: "state-1",
        redirectUri: "http://localhost:9080/auth/google/callback",
      }),
    ).toEqual({
      thirdPartyId: "google",
      clientType: "web",
      redirectURIInfo: {
        redirectURIOnProviderDashboard:
          "http://localhost:9080/auth/google/callback",
        redirectURIQueryParams: {
          code: "auth-code",
          scope: "email profile",
          state: "state-1",
        },
      },
    });
  });
});
