import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { UserProvider } from "@web/auth/context/UserProvider";
import { useSession } from "@web/auth/hooks/session/useSession";
import { useUser } from "@web/auth/hooks/user/useUser";
import * as authStateUtil from "@web/auth/state/auth.state.util";

jest.mock("@web/auth/hooks/session/useSession", () => ({
  useSession: jest.fn(),
}));
const mockUseSession = jest.mocked(useSession);

jest.mock("@web/auth/state/auth.state.util", () => {
  const actual = jest.requireActual<typeof authStateUtil>(
    "@web/auth/state/auth.state.util",
  );
  return {
    ...actual,
    getLastKnownEmail: jest.fn(),
    hasUserEverAuthenticated: jest.fn(),
  };
});
const mockGetLastKnownEmail = jest.mocked(authStateUtil.getLastKnownEmail);
const mockHasUserEverAuthenticated = jest.mocked(
  authStateUtil.hasUserEverAuthenticated,
);

const UserEmail = () => <div>{useUser().email ?? "no-email"}</div>;

describe("UserProvider", () => {
  let isAuthenticated = false;

  beforeEach(() => {
    jest.clearAllMocks();
    isAuthenticated = false;
    mockGetLastKnownEmail.mockReturnValue("last-known@example.com");
    mockHasUserEverAuthenticated.mockReturnValue(true);
    mockUseSession.mockImplementation(() => ({
      authenticated: isAuthenticated,
      setAuthenticated: jest.fn(),
    }));
  });

  it("renders children", () => {
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

    rerender(
      <UserProvider>
        <UserEmail />
      </UserProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });
  });
});
