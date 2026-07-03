import { GOOGLE_AUTH_SCOPES_REQUIRED } from "@web/auth/google/authorization/google-authorization.constants";
import { writeGoogleAuthorizationIntent } from "@web/auth/google/authorization/google-authorization.storage";
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
  });

  it("rejects a Google callback that is missing required calendar scopes", async () => {
    writeGoogleAuthorizationIntent("state-1", {
      intent: "signIn",
      returnPath: "/week",
      createdAt: Date.now(),
    });

    await completeGoogleAuthCallback({
      completeAuthentication,
      navigate,
      search: `?state=state-1&code=auth-code&scope=${encodeURIComponent(
        GOOGLE_AUTH_SCOPES_REQUIRED[0],
      )}`,
    });

    expect(mockLoginOrSignup).not.toHaveBeenCalled();
    expect(mockConnectGoogle).not.toHaveBeenCalled();
    expect(completeAuthentication).not.toHaveBeenCalled();
    expect(mockShowErrorToast).toHaveBeenCalledWith(
      "Missing Google Calendar permissions. Please grant all requested permissions.",
    );
    expect(navigate).toHaveBeenCalledWith("/week", { replace: true });
  });
});
