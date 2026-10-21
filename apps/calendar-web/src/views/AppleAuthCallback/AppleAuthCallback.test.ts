import { createTestToastPort } from "@web/__tests__/helpers/web-test-seams";
import { AuthApi } from "@web/api/auth.api";
import { session } from "@web/auth/compass/session/Session";
import {
  readProviderAuthorizationIntent,
  writeProviderAuthorizationIntent,
} from "@web/auth/providers/authorization/provider-authorization.storage";
import { registerToastPort } from "@web/common/utils/toast/toast.port";
import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";

mock.module(
  "@web/auth/providers/authorization/relay-provider-oauth-callback-telemetry",
  () => ({
    relayProviderOAuthCallbackTelemetry: () => undefined,
  }),
);

const mockLoginOrSignup = mock();
const realLoginOrSignup = AuthApi.loginOrSignup;
AuthApi.loginOrSignup = mockLoginOrSignup as typeof AuthApi.loginOrSignup;

afterAll(() => {
  AuthApi.loginOrSignup = realLoginOrSignup;
});

const { port, mocks } = createTestToastPort();

const { completeAppleAuthCallback } = await import("./AppleAuthCallback");

const callbackSearch = (state: string) =>
  `?state=${encodeURIComponent(state)}&code=auth-code`;

const writeIntent = (state: string, returnPath = "/week") => {
  writeProviderAuthorizationIntent("apple", state, {
    intent: "signIn",
    returnPath,
    createdAt: Date.now(),
  });
};

describe("completeAppleAuthCallback", () => {
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
      createdNewRecipeUser: true,
      user: { emails: ["hidden@privaterelay.appleid.com"] },
    });
  });

  it("finishes a saved Apple sign-in intent without requiring calendar scopes", async () => {
    writeIntent("sign-in-state", "/week");

    await completeAppleAuthCallback({
      completeAuthentication,
      navigate,
      search: callbackSearch("sign-in-state"),
    });

    expect(mockLoginOrSignup).toHaveBeenCalledWith(
      expect.objectContaining({
        thirdPartyId: "apple",
        redirectURIInfo: expect.objectContaining({
          redirectURIOnProviderDashboard: expect.stringMatching(
            /\/api\/auth\/apple\/callback$/,
          ),
          redirectURIQueryParams: expect.objectContaining({
            code: "auth-code",
            state: "sign-in-state",
          }),
        }),
      }),
    );
    expect(completeAuthentication).toHaveBeenCalledWith({
      email: "hidden@privaterelay.appleid.com",
    });
    expect(mocks.error).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("/week", { replace: true });
    expect(
      readProviderAuthorizationIntent("apple", "sign-in-state"),
    ).toBeNull();
  });

  it("rejects an Apple callback without a saved intent", async () => {
    spyOn(session, "doesSessionExist").mockResolvedValue(false);

    await completeAppleAuthCallback({
      completeAuthentication,
      navigate,
      search: callbackSearch("unknown-state"),
    });

    expect(mockLoginOrSignup).not.toHaveBeenCalled();
    expect(completeAuthentication).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalledWith(
      "We couldn't sign you in with Apple. Please try again.",
      expect.any(Object),
    );
    expect(navigate).toHaveBeenCalledWith("/week", { replace: true });
  });

  it("ignores a replayed Apple callback when the user is already signed in", async () => {
    spyOn(session, "doesSessionExist").mockResolvedValue(true);

    await completeAppleAuthCallback({
      completeAuthentication,
      navigate,
      search: callbackSearch("consumed-state"),
    });

    expect(mockLoginOrSignup).not.toHaveBeenCalled();
    expect(completeAuthentication).not.toHaveBeenCalled();
    expect(mocks.error).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("/week", { replace: true });
  });
});
