import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

import { act } from "react";
const { cleanup, render, screen, waitFor } =
  require("@testing-library/react") as typeof import("@testing-library/react");

const mockGetLastKnownEmail = mock();
const mockHasUserEverAuthenticated = mock();
const mockMarkUserAsAuthenticated = mock();
const mockClearAnonymousCalendarChangeSignUpPrompt = mock();
const mockClearAuthenticationState = mock();
const mockGetAuthState = mock();
const mockMarkAnonymousCalendarChangeForSignUpPrompt = mock();
const mockShouldShowAnonymousCalendarChangeSignUpPrompt = mock();
const mockSubscribeToAuthState = mock();
const mockUpdateAuthState = mock();
const mockGetProfile = mock();
const mockUseSession = mock();

mock.module("@web/auth/compass/session/useSession", () => ({
  useSession: mockUseSession,
}));

mock.module("@web/auth/compass/state/auth.state.util", () => ({
  clearAnonymousCalendarChangeSignUpPrompt:
    mockClearAnonymousCalendarChangeSignUpPrompt,
  clearAuthenticationState: mockClearAuthenticationState,
  getAuthState: mockGetAuthState,
  getLastKnownEmail: mockGetLastKnownEmail,
  hasUserEverAuthenticated: mockHasUserEverAuthenticated,
  markUserAsAuthenticated: mockMarkUserAsAuthenticated,
  markAnonymousCalendarChangeForSignUpPrompt:
    mockMarkAnonymousCalendarChangeForSignUpPrompt,
  shouldShowAnonymousCalendarChangeSignUpPrompt:
    mockShouldShowAnonymousCalendarChangeSignUpPrompt,
  subscribeToAuthState: mockSubscribeToAuthState,
  updateAuthState: mockUpdateAuthState,
}));

mock.module("@web/common/apis/user.api", () => ({
  UserApi: {
    getProfile: mockGetProfile,
  },
}));

const { UserProvider } =
  require("@web/auth/compass/user/context/UserProvider") as typeof import("@web/auth/compass/user/context/UserProvider");
const { useUser } =
  require("@web/auth/compass/user/hooks/useUser") as typeof import("@web/auth/compass/user/hooks/useUser");

const UserEmail = () => <div>{useUser().email ?? "no-email"}</div>;

describe("UserProvider", () => {
  let isAuthenticated = false;

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    mockGetLastKnownEmail.mockClear();
    mockGetProfile.mockClear();
    mockHasUserEverAuthenticated.mockClear();
    mockMarkUserAsAuthenticated.mockClear();
    mockClearAnonymousCalendarChangeSignUpPrompt.mockClear();
    mockClearAuthenticationState.mockClear();
    mockGetAuthState.mockClear();
    mockUseSession.mockClear();
    isAuthenticated = false;
    mockMarkAnonymousCalendarChangeForSignUpPrompt.mockClear();
    mockShouldShowAnonymousCalendarChangeSignUpPrompt.mockClear();
    mockSubscribeToAuthState.mockClear();
    mockUpdateAuthState.mockClear();
    mockGetProfile.mockResolvedValue({
      userId: "test-user-123",
      email: "test@example.com",
    });
    mockGetLastKnownEmail.mockReturnValue("last-known@example.com");
    mockHasUserEverAuthenticated.mockReturnValue(true);
    mockUseSession.mockImplementation(() => ({
      authenticated: isAuthenticated,
      setAuthenticated: mock(),
    }));
  });

  it("renders children", () => {
    mockHasUserEverAuthenticated.mockReturnValue(false);

    render(
      <UserProvider>
        <div>Test Child</div>
      </UserProvider>,
    );

    expect(screen.getByText("Test Child")).toBeInTheDocument();
  });

  it("fetches the profile when session auth completes after mount (hasAuthenticatedBefore becomes true)", async () => {
    mockHasUserEverAuthenticated.mockReturnValue(false);

    const { rerender } = render(
      <UserProvider>
        <UserEmail />
      </UserProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("no-email")).toBeInTheDocument();
    });

    isAuthenticated = true;

    await act(async () => {
      rerender(
        <UserProvider>
          <UserEmail />
        </UserProvider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });
  });
});
