import { faker } from "@faker-js/faker";
import { renderHook, waitFor } from "@testing-library/react";
import { useIsSignupComplete } from "@web/auth/hooks/useIsSignupComplete";
import { useSession } from "@web/auth/hooks/useSession";
import { useSkipOnboarding } from "@web/auth/hooks/useSkipOnboarding";
import { CompassSession } from "@web/auth/session/session.types";
import { AuthApi } from "@web/common/apis/auth.api";
import { UserApi } from "@web/common/apis/user.api";
import { useGoogleAuth } from "@web/common/hooks/useGoogleAuth";
import { markUserAsAuthenticated } from "@web/common/utils/storage/auth-state.util";
import { syncLocalEventsToCloud } from "@web/common/utils/sync/local-event-sync.util";
import { useGoogleLogin } from "@web/components/oauth/google/useGoogleLogin";
import { SignInUpInput } from "@web/components/oauth/ouath.types";

// Mock dependencies
jest.mock("@web/common/apis/auth.api");
jest.mock("@web/common/apis/user.api");
jest.mock("@web/auth/hooks/useSession");
jest.mock("@web/auth/hooks/useIsSignupComplete");
jest.mock("@web/auth/hooks/useSkipOnboarding");
jest.mock("@web/components/oauth/google/useGoogleLogin");
jest.mock("@web/common/utils/storage/auth-state.util");
jest.mock("@web/common/utils/sync/local-event-sync.util");
jest.mock("@web/store/store.hooks", () => ({
  useAppDispatch: () => jest.fn(),
}));
jest.mock("react-router-dom", () => ({
  useNavigate: () => jest.fn(),
}));
jest.mock("react-toastify", () => ({
  toast: Object.assign(jest.fn(), {
    error: jest.fn(),
    success: jest.fn(),
  }),
}));

const mockAuthApi = AuthApi as jest.Mocked<typeof AuthApi>;
const mockUserApi = UserApi as jest.Mocked<typeof UserApi>;
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockUseIsSignupComplete = useIsSignupComplete as jest.MockedFunction<
  typeof useIsSignupComplete
>;
const mockUseSkipOnboarding = useSkipOnboarding as jest.MockedFunction<
  typeof useSkipOnboarding
>;
const mockUseGoogleLogin = useGoogleLogin as jest.MockedFunction<
  typeof useGoogleLogin
>;
const mockMarkUserAsAuthenticated =
  markUserAsAuthenticated as jest.MockedFunction<
    typeof markUserAsAuthenticated
  >;
const mockSyncLocalEventsToCloud =
  syncLocalEventsToCloud as jest.MockedFunction<typeof syncLocalEventsToCloud>;

describe("useGoogleAuth", () => {
  const mockSetAuthenticated = jest.fn();
  const mockSetIsSyncing = jest.fn();
  const mockMarkSignupCompleted = jest.fn();
  const mockUpdateOnboardingStatus = jest.fn();
  const mockLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    const mockSession: CompassSession = {
      setAuthenticated: mockSetAuthenticated,
      setIsSyncing: mockSetIsSyncing,
      authenticated: false,
      isSyncing: false,
      loading: false,
      setLoading: jest.fn(),
    };
    mockUseSession.mockReturnValue(mockSession);
    mockUseIsSignupComplete.mockReturnValue({
      markSignupCompleted: mockMarkSignupCompleted,
      isSignupComplete: false,
    });
    mockUseSkipOnboarding.mockReturnValue({
      updateOnboardingStatus: mockUpdateOnboardingStatus,
      skipOnboarding: false,
    });
    mockAuthApi.loginOrSignup.mockResolvedValue({
      createdNewRecipeUser: true,
      status: "OK",
      user: {
        id: "user-id",
        isPrimaryUser: false,
        emails: [faker.internet.email()],
        tenantIds: ["public"],
        phoneNumbers: [],
        thirdParty: [{ id: "google", userId: "google-user-id" }],
        webauthn: { credentialIds: [] },
        loginMethods: [],
        timeJoined: Date.now(),
        toJson: jest.fn(),
      },
    });
    mockUserApi.getMetadata.mockResolvedValue({
      skipOnboarding: true,
    });
    mockSyncLocalEventsToCloud.mockResolvedValue(0);
  });

  it("keeps isSyncing true after authentication and does not set it to false", async () => {
    let onSuccessCallback: ((data: SignInUpInput) => Promise<void>) | undefined;

    mockUseGoogleLogin.mockImplementation(({ onSuccess }) => {
      onSuccessCallback = onSuccess;
      return {
        login: mockLogin,
        loading: false,
        data: null,
      };
    });

    renderHook(() => useGoogleAuth());

    // Simulate Google login success
    if (onSuccessCallback) {
      await onSuccessCallback({
        clientType: "web",
        thirdPartyId: "google",
        redirectURIInfo: {
          redirectURIOnProviderDashboard: "",
          redirectURIQueryParams: {
            code: "test-auth-code",
            scope: "email profile",
            state: undefined,
          },
        },
      });
    }

    await waitFor(() => {
      expect(mockSetIsSyncing).toHaveBeenCalledWith(true);
    });

    // Verify setIsSyncing(false) was NOT called
    // (it should only be called by SocketProvider when IMPORT_GCAL_END is received)
    expect(mockSetIsSyncing).not.toHaveBeenCalledWith(false);
  });

  it("sets isSyncing to true after successful authentication", async () => {
    let onSuccessCallback: ((data: SignInUpInput) => Promise<void>) | undefined;

    mockUseGoogleLogin.mockImplementation(({ onSuccess }) => {
      onSuccessCallback = onSuccess;
      return {
        login: mockLogin,
        loading: false,
        data: null,
      };
    });

    renderHook(() => useGoogleAuth());

    // Simulate Google login success
    if (onSuccessCallback) {
      await onSuccessCallback({
        clientType: "web",
        thirdPartyId: "google",
        redirectURIInfo: {
          redirectURIOnProviderDashboard: "",
          redirectURIQueryParams: {
            code: "test-auth-code",
            scope: "email profile",
            state: undefined,
          },
        },
      });
    }

    await waitFor(() => {
      expect(mockSetIsSyncing).toHaveBeenCalledWith(true);
    });

    expect(mockSetAuthenticated).toHaveBeenCalledWith(true);
    expect(mockMarkUserAsAuthenticated).toHaveBeenCalled();
  });
});
