import "@testing-library/jest-dom";
import { waitFor } from "@testing-library/react";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { ProtectedRoute } from "@web/auth/ProtectedRoute";
import { useHasCompletedSignup } from "@web/auth/useHasCompletedSignup";
import { AUTH_FAILURE_REASONS } from "@web/common/constants/auth.constants";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { useSession } from "@web/common/hooks/useSession";

// Mock dependencies
jest.mock("@web/common/hooks/useSession");
jest.mock("@web/auth/useHasCompletedSignup");

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockUseHasCompletedSignup = useHasCompletedSignup as jest.MockedFunction<
  typeof useHasCompletedSignup
>;

// Mock navigate function
const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

describe("ProtectedRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    localStorage.clear();
  });

  describe("Redirect Logic", () => {
    it("redirects to /onboarding when not authenticated and hasCompletedSignup is false", async () => {
      mockUseSession.mockReturnValue({
        authenticated: false,
        loading: false,
        setAuthenticated: jest.fn(),
        setLoading: jest.fn(),
      });

      mockUseHasCompletedSignup.mockReturnValue({
        hasCompletedSignup: false,
        markSignupCompleted: jest.fn(),
      });

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>,
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(ROOT_ROUTES.ONBOARDING);
      });
    });

    it("redirects to /login when not authenticated and hasCompletedSignup is true (user session expired)", async () => {
      mockUseSession.mockReturnValue({
        authenticated: false,
        loading: false,
        setAuthenticated: jest.fn(),
        setLoading: jest.fn(),
      });
      mockUseHasCompletedSignup.mockReturnValue({
        hasCompletedSignup: true,
        markSignupCompleted: jest.fn(),
      });

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>,
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          `${ROOT_ROUTES.LOGIN}?reason=${AUTH_FAILURE_REASONS.USER_SESSION_EXPIRED}`,
        );
      });
    });

    it("redirects to /login when not authenticated and hasCompletedSignup is true (user session expired)", async () => {
      mockUseSession.mockReturnValue({
        authenticated: false,
        loading: false,
        setAuthenticated: jest.fn(),
        setLoading: jest.fn(),
      });
      mockUseHasCompletedSignup.mockReturnValue({
        hasCompletedSignup: true,
        markSignupCompleted: jest.fn(),
      });

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>,
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          `${ROOT_ROUTES.LOGIN}?reason=${AUTH_FAILURE_REASONS.USER_SESSION_EXPIRED}`,
        );
      });
    });

    it("does not redirect when authenticated", async () => {
      mockUseSession.mockReturnValue({
        authenticated: true,
        loading: false,
        setAuthenticated: jest.fn(),
        setLoading: jest.fn(),
      });
      mockUseHasCompletedSignup.mockReturnValue({
        hasCompletedSignup: true,
        markSignupCompleted: jest.fn(),
      });

      const { getByText } = render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>,
      );

      await waitFor(() => {
        expect(getByText("Protected Content")).toBeInTheDocument();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("does not redirect when hasCompletedSignup is null (loading state)", async () => {
      mockUseSession.mockReturnValue({
        authenticated: false,
        loading: false,
        setAuthenticated: jest.fn(),
        setLoading: jest.fn(),
      });
      mockUseHasCompletedSignup.mockReturnValue({
        hasCompletedSignup: null,
        markSignupCompleted: jest.fn(),
      });

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>,
      );

      // Wait a bit to ensure redirect doesn't happen
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should not redirect while loading
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe("localStorage Integration", () => {
    it("checks localStorage for hasCompletedSignup when determining redirect", async () => {
      localStorage.setItem(STORAGE_KEYS.HAS_COMPLETED_SIGNUP, "true");

      mockUseSession.mockReturnValue({
        authenticated: false,
        loading: false,
        setAuthenticated: jest.fn(),
        setLoading: jest.fn(),
      });
      mockUseHasCompletedSignup.mockReturnValue({
        hasCompletedSignup: true,
        markSignupCompleted: jest.fn(),
      });

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>,
      );

      await waitFor(() => {
        expect(mockUseHasCompletedSignup).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith(
          expect.stringContaining(ROOT_ROUTES.LOGIN),
        );
      });
    });

    it("redirects to /onboarding when localStorage indicates user hasn't completed signup", async () => {
      localStorage.setItem(STORAGE_KEYS.HAS_COMPLETED_SIGNUP, "false");

      mockUseSession.mockReturnValue({
        authenticated: false,
        loading: false,
        setAuthenticated: jest.fn(),
        setLoading: jest.fn(),
      });
      mockUseHasCompletedSignup.mockReturnValue({
        hasCompletedSignup: false,
        markSignupCompleted: jest.fn(),
      });

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>,
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(ROOT_ROUTES.ONBOARDING);
      });
    });
  });
});
