import { GOOGLE_AUTH_SCOPES_REQUIRED } from "@web/auth/google/authorization/google-authorization.constants";
import {
  readGoogleAuthorizationIntent,
  writeGoogleAuthorizationIntent,
} from "@web/auth/google/authorization/google-authorization.storage";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockLoginOrSignup = mock();
const mockConnectGoogle = mock();
const mockShowErrorToast = mock();

mock.module("@web/common/apis/auth.api", () => ({
  AuthApi: {
    loginOrSignup: mockLoginOrSignup,
    connectGoogle: mockConnectGoogle,
  },
}));

mock.module("@web/common/utils/toast/error-toast.util", () => ({
  ErrorToastSeverity: {
    DEFAULT: "default",
    CRITICAL: "critical",
  },
  SESSION_EXPIRED_TOAST_ID: "session-expired-api",
  dismissErrorToast: mock(),
  showErrorToast: mockShowErrorToast,
  showSessionExpiredToast: mock(),
}));

const { completeGoogleAuthCallback } =
  require("./GoogleAuthCallback") as typeof import("./GoogleAuthCallback");

const callbackSearch = (
  state: string,
  scope = GOOGLE_AUTH_SCOPES_REQUIRED.join(" "),
) =>
  `?state=${encodeURIComponent(
    state,
  )}&code=auth-code&scope=${encodeURIComponent(scope)}`;

const writeIntent = (
  state: string,
  intent: "signIn" | "connectCalendar",
  returnPath = "/week",
) => {
  writeGoogleAuthorizationIntent(state, {
    intent,
    returnPath,
    createdAt: Date.now(),
  });
};

describe("completeGoogleAuthCallback", () => {
  const completeAuthentication = mock();
  const navigate = mock();

  beforeEach(() => {
    sessionStorage.clear();
    mockLoginOrSignup.mockClear();
    mockConnectGoogle.mockClear();
    mockShowErrorToast.mockClear();
    completeAuthentication.mockClear();
    navigate.mockClear();
    mockLoginOrSignup.mockResolvedValue({
      user: { emails: ["user@example.com"] },
    });
    mockConnectGoogle.mockResolvedValue({});
  });

  it("finishes a saved Google sign-in intent and returns to the saved path", async () => {
    writeIntent("sign-in-state", "signIn", "/week");

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
    expect(mockConnectGoogle).not.toHaveBeenCalled();
    expect(completeAuthentication).toHaveBeenCalledWith({
      email: "user@example.com",
    });
    expect(mockShowErrorToast).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("/week", { replace: true });
    expect(readGoogleAuthorizationIntent("sign-in-state")).toBeNull();
  });

  it("rejects a Google callback that is missing required calendar scopes", async () => {
    writeIntent("missing-scopes-state", "signIn", "/week");

    await completeGoogleAuthCallback({
      completeAuthentication,
      navigate,
      search: callbackSearch(
        "missing-scopes-state",
        GOOGLE_AUTH_SCOPES_REQUIRED[0],
      ),
    });

    expect(mockLoginOrSignup).not.toHaveBeenCalled();
    expect(mockConnectGoogle).not.toHaveBeenCalled();
    expect(completeAuthentication).not.toHaveBeenCalled();
    expect(mockShowErrorToast).toHaveBeenCalledWith(
      "Missing Google Calendar permissions. Please grant all requested permissions.",
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
    expect(mockConnectGoogle).not.toHaveBeenCalled();
    expect(completeAuthentication).not.toHaveBeenCalled();
    expect(mockShowErrorToast).toHaveBeenCalledWith(
      "Google authorization could not be completed. Please try again.",
    );
    expect(navigate).toHaveBeenCalledWith("/day", { replace: true });
  });
});
