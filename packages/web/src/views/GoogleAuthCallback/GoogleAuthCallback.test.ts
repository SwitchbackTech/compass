import { createTestToastPort } from "@web/__tests__/helpers/web-test-seams";
import { AuthApi } from "@web/api/auth.api";
import { GOOGLE_AUTH_SCOPES_REQUIRED } from "@web/auth/google/authorization/google-authorization.constants";
import {
  readGoogleAuthorizationIntent,
  writeGoogleAuthorizationIntent,
} from "@web/auth/google/authorization/google-authorization.storage";
import { registerToastPort } from "@web/common/utils/toast/toast.port";
import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";

// Patch the one method on the real AuthApi object rather than replacing the
// module: mock.module is process-wide and permanent, and an AuthApi carrying
// only loginOrSignup breaks every later file that reaches for another method
// (useConnectGoogle.scope.test.tsx spies on beginGoogleConnection).
const mockLoginOrSignup = mock();
const realLoginOrSignup = AuthApi.loginOrSignup;
AuthApi.loginOrSignup = mockLoginOrSignup as typeof AuthApi.loginOrSignup;

afterAll(() => {
  AuthApi.loginOrSignup = realLoginOrSignup;
});

const { port, mocks } = createTestToastPort();

const { completeGoogleAuthCallback } =
  require("./GoogleAuthCallback") as typeof import("./GoogleAuthCallback");

const callbackSearch = (
  state: string,
  scope = GOOGLE_AUTH_SCOPES_REQUIRED.join(" "),
) =>
  `?state=${encodeURIComponent(
    state,
  )}&code=auth-code&scope=${encodeURIComponent(scope)}`;

const writeIntent = (state: string, returnPath = "/week") => {
  writeGoogleAuthorizationIntent(state, {
    intent: "signIn",
    returnPath,
    createdAt: Date.now(),
  });
};

describe("completeGoogleAuthCallback", () => {
  const completeAuthentication = mock();
  const navigate = mock();

  beforeEach(() => {
    mocks.error.mockClear();
    registerToastPort(port);
    sessionStorage.clear();
    mockLoginOrSignup.mockClear();
    completeAuthentication.mockClear();
    navigate.mockClear();
    mockLoginOrSignup.mockResolvedValue({
      user: { emails: ["user@example.com"] },
    });
  });

  it("finishes a saved Google sign-in intent and returns to the saved path", async () => {
    writeIntent("sign-in-state", "/week");

    await completeGoogleAuthCallback({
      completeAuthentication,
      navigate,
      search: callbackSearch("sign-in-state"),
    });

    expect(mockLoginOrSignup).toHaveBeenCalledWith(
      expect.objectContaining({
        redirectURIInfo: expect.objectContaining({
          redirectURIQueryParams: expect.objectContaining({
            code: "auth-code",
            state: "sign-in-state",
          }),
        }),
        thirdPartyId: "google",
      }),
    );
    expect(completeAuthentication).toHaveBeenCalledWith({
      email: "user@example.com",
    });
    expect(mocks.error).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("/week", { replace: true });
    expect(readGoogleAuthorizationIntent("sign-in-state")).toBeNull();
  });

  it("rejects a Google callback that is missing required calendar scopes", async () => {
    writeIntent("missing-scopes-state", "/week");

    await completeGoogleAuthCallback({
      completeAuthentication,
      navigate,
      search: callbackSearch(
        "missing-scopes-state",
        GOOGLE_AUTH_SCOPES_REQUIRED[0],
      ),
    });

    expect(mockLoginOrSignup).not.toHaveBeenCalled();
    expect(completeAuthentication).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalledWith(
      "Compass needs all the requested permissions to sync your calendar. Please allow them and try again.",
      expect.any(Object),
    );
    expect(navigate).toHaveBeenCalledWith("/week", { replace: true });
  });

  it("rejects a Google callback without a saved intent", async () => {
    await completeGoogleAuthCallback({
      completeAuthentication,
      navigate,
      search: callbackSearch("unknown-state"),
    });

    expect(mockLoginOrSignup).not.toHaveBeenCalled();
    expect(completeAuthentication).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalledWith(
      "We couldn't connect your Google account. Please try again.",
      expect.any(Object),
    );
    expect(navigate).toHaveBeenCalledWith("/week", { replace: true });
  });
});
