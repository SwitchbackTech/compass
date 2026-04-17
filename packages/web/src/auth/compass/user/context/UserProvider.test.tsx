import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

import { act } from "react";
const { cleanup, render, screen, waitFor } =
  require("@testing-library/react") as typeof import("@testing-library/react");

const mockGetLastKnownEmail = mock();
const mockHasUserEverAuthenticated = mock();
const mockMarkUserAsAuthenticated = mock();
const mockGetProfile = mock();
const mockUseSession = mock();

mock.module("@web/auth/compass/session/useSession", () => ({
  useSession: mockUseSession,
}));

mock.module("@web/auth/compass/state/auth.state.util", () => ({
  getLastKnownEmail: mockGetLastKnownEmail,
  hasUserEverAuthenticated: mockHasUserEverAuthenticated,
  markUserAsAuthenticated: mockMarkUserAsAuthenticated,
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
    mockUseSession.mockClear();
    isAuthenticated = false;
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
