import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { act, type ReactElement } from "react";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createTestRouter } from "@web/__tests__/utils/providers/createTestRouter";
import { validateAuthSearch } from "@web/components/AuthModal/hooks/useAuthModal";
import { beforeEach, describe, expect, it, mock } from "bun:test";

// Mock useSession
const mockUseSession = mock(() => ({
  authenticated: false,
  setAuthenticated: mock(),
}));

mock.module("@web/auth/compass/session/useSession", () => ({
  useSession: () => mockUseSession(),
}));

// Mock Google authorization start hook
const mockGoogleLogin = mock();
mock.module(
  "@web/auth/google/authorization/useStartGoogleAuthorization",
  () => ({
    useStartGoogleAuthorization: () => ({
      startGoogleAuthorization: mockGoogleLogin,
    }),
  }),
);

const mockUseIsGoogleAvailable = mock(() => true);
mock.module(
  "@web/auth/google/hooks/useIsGoogleAvailable/useIsGoogleAvailable",
  () => ({
    useIsGoogleAvailable: () => mockUseIsGoogleAvailable(),
  }),
);

mock.module("@web/common/constants/env.constants", () => ({
  ENV_WEB: {
    GOOGLE_CLIENT_ID: "test-client-id",
  },
  IS_GOOGLE_AUTH_CONFIGURED: true,
}));

const mockCompleteAuthentication = mock();
mock.module("@web/auth/compass/hooks/useCompleteAuthentication", () => ({
  useCompleteAuthentication: () => mockCompleteAuthentication,
}));

const mockUpdateMetadata = mock();
mock.module("@web/common/apis/user.api", () => ({
  UserApi: { updateMetadata: mockUpdateMetadata },
}));

const mockEmailPassword = {
  getResetPasswordTokenFromURL: mock(),
  sendPasswordResetEmail: mock(),
  signIn: mock(),
  signUp: mock(),
  submitNewPassword: mock(),
};

mock.module("supertokens-web-js/recipe/emailpassword", () => ({
  default: mockEmailPassword,
  ...mockEmailPassword,
}));

// Mock GoogleButton - uses button with label for semantic queries (matches real component's aria-label)
mock.module("@web/components/AuthModal/components/GoogleButton", () => ({
  GoogleButton: ({
    onClick,
    label,
  }: {
    onClick: () => void;
    label: string;
  }) => (
    <button type="button" onClick={onClick} aria-label={label}>
      {label}
    </button>
  ),
}));

const { redirectToToday, loadTodayData } = await import("@web/routers/loaders");
const { ROOT_ROUTES } = await import("@web/common/constants/routes");

// Imported dynamically (after the mock.module calls above) so the mocked
// session/Google/emailpassword modules are in place before AuthModal's
// dependency chain (via useAuthFormHandlers) first resolves them.
const { AuthModal } = await import("./AuthModal");
const { AuthModalProvider } = await import("./AuthModalProvider");
const { useAuthModal } = await import("./hooks/useAuthModal");

// Helper component to trigger modal open
const ModalTrigger = () => {
  const { openModal } = useAuthModal();
  return (
    <button type="button" onClick={() => openModal("login")}>
      Open Modal
    </button>
  );
};

/**
 * Renders `component` and `AuthModal` as the root route's content on a
 * memory-history router, mirroring how RootShell mounts them in production.
 */
const renderWithProviders = async (
  component: ReactElement,
  initialRoute: string = "/day",
) => {
  const router = createTestRouter(
    <AuthModalProvider>
      {component}
      <AuthModal />
    </AuthModalProvider>,
    { initialEntries: [initialRoute] },
  );
  const result = render(<RouterProvider router={router} />);

  // TanStack's RouterProvider resolves the initial match asynchronously
  // (even with no loaders), unlike react-router-dom's synchronous
  // MemoryRouter, so tests must wait for it to settle before querying.
  await waitFor(() => {
    expect(router.state.status).toBe("idle");
  });

  return { router, ...result };
};

async function flushEffects() {
  await Promise.resolve();
}

const DayRedirectShell = () => (
  <AuthModalProvider>
    <AuthModal />
    <Outlet />
  </AuthModalProvider>
);

const renderWithDayRedirectRoute = (initialRoute: string) => {
  const dayRootRoute = createRootRoute({ validateSearch: validateAuthSearch });
  const dayRoute = createRoute({
    getParentRoute: () => dayRootRoute,
    path: "/day",
    component: DayRedirectShell,
  });
  const dayIndexRoute = createRoute({
    getParentRoute: () => dayRoute,
    path: "/",
    beforeLoad: () => redirectToToday(ROOT_ROUTES.DAY_DATE),
  });
  const dayDateRoute = createRoute({
    getParentRoute: () => dayRoute,
    path: "$dateString",
    component: () => <div>Day route loaded</div>,
  });

  const router = createRouter({
    routeTree: dayRootRoute.addChildren([
      dayRoute.addChildren([dayIndexRoute, dayDateRoute]),
    ]),
    history: createMemoryHistory({ initialEntries: [initialRoute] }),
    defaultPendingMs: 0,
  });

  return {
    router,
    ...render(<RouterProvider router={router} />),
  };
};

describe("AuthModal", () => {
  beforeEach(() => {
    mockUseSession.mockClear();
    mockGoogleLogin.mockClear();
    mockUseIsGoogleAvailable.mockClear();
    mockCompleteAuthentication.mockClear();
    mockEmailPassword.signUp.mockClear();
    mockEmailPassword.signIn.mockClear();
    mockEmailPassword.sendPasswordResetEmail.mockClear();
    mockEmailPassword.getResetPasswordTokenFromURL.mockClear();
    mockEmailPassword.submitNewPassword.mockClear();
    mockUpdateMetadata.mockClear();
    mockUpdateMetadata.mockResolvedValue({ subscribeToUpdates: true });
    mockUseSession.mockReturnValue({
      authenticated: false,
      setAuthenticated: mock(),
    });
    mockUseIsGoogleAvailable.mockReturnValue(true);
    mockEmailPassword.signUp.mockResolvedValue({
      status: "OK",
      user: { emails: ["test@example.com"] },
    });
    mockEmailPassword.signIn.mockResolvedValue({
      status: "OK",
      user: { emails: ["test@example.com"] },
    });
    mockEmailPassword.sendPasswordResetEmail.mockResolvedValue({
      status: "OK",
    });
    mockEmailPassword.getResetPasswordTokenFromURL.mockReturnValue("token");
    mockEmailPassword.submitNewPassword.mockResolvedValue({
      status: "OK",
    });
  });

  describe("Modal Open/Close", () => {
    it("opens modal when triggered", async () => {
      const user = userEvent.setup();
      await renderWithProviders(<ModalTrigger />);

      expect(
        screen.queryByRole("heading", { name: /hey, welcome back/i }),
      ).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /open modal/i }));
      await flushEffects();

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /hey, welcome back/i }),
        ).toBeInTheDocument();
      });
    });

    it("closes modal when backdrop is clicked", async () => {
      const user = userEvent.setup();
      await renderWithProviders(<ModalTrigger />);

      await user.click(screen.getByRole("button", { name: /open modal/i }));
      await flushEffects();

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /hey, welcome back/i }),
        ).toBeInTheDocument();
      });

      // Click on backdrop using semantic role query
      const backdrop = screen.getByRole("presentation");
      expect(backdrop).toBeInTheDocument();

      await user.click(backdrop);
      await flushEffects();

      await waitFor(() => {
        expect(
          screen.queryByRole("heading", { name: /hey, welcome back/i }),
        ).not.toBeInTheDocument();
      });
    });

    it("closes modal when Escape key is pressed", async () => {
      const user = userEvent.setup();
      await renderWithProviders(<ModalTrigger />);

      await user.click(screen.getByRole("button", { name: /open modal/i }));
      await flushEffects();

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /hey, welcome back/i }),
        ).toBeInTheDocument();
      });

      // Focus the backdrop so it can receive keyboard events
      const backdrop = screen.getByRole("presentation");
      await act(async () => {
        backdrop.focus();
      });

      await user.keyboard("{Escape}");
      await flushEffects();

      await waitFor(() => {
        expect(
          screen.queryByRole("heading", { name: /hey, welcome back/i }),
        ).not.toBeInTheDocument();
      });
    });

    it("opens with a pushed ?auth= entry and closes on browser back", async () => {
      const user = userEvent.setup();
      const { router } = await renderWithProviders(<ModalTrigger />);

      await user.click(screen.getByRole("button", { name: /open modal/i }));
      await flushEffects();

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /hey, welcome back/i }),
        ).toBeInTheDocument();
      });
      expect(router.state.location.searchStr).toBe("?auth=login");

      // Simulate the browser back button popping the pushed entry
      await act(async () => {
        router.history.back();
      });

      await waitFor(() => {
        expect(
          screen.queryByRole("heading", { name: /hey, welcome back/i }),
        ).not.toBeInTheDocument();
      });
    });

    it("removes the ?auth= param when the modal is dismissed", async () => {
      const user = userEvent.setup();
      const { router } = await renderWithProviders(<ModalTrigger />);

      await user.click(screen.getByRole("button", { name: /open modal/i }));
      await flushEffects();
      expect(router.state.location.searchStr).toBe("?auth=login");

      const backdrop = screen.getByRole("presentation");
      await act(async () => {
        backdrop.focus();
      });
      await user.keyboard("{Escape}");
      await flushEffects();

      expect(router.state.location.searchStr).toBe("");
    });
  });

  describe("Auth view switching", () => {
    it("shows sign up when on sign in form", async () => {
      const user = userEvent.setup();
      await renderWithProviders(<ModalTrigger />);

      await user.click(screen.getByRole("button", { name: /open modal/i }));

      await waitFor(() => {
        const signUpSwitch = screen.getByRole("button", { name: /^sign up$/i });
        expect(signUpSwitch).toBeInTheDocument();
      });
    });

    it("switches to Sign Up form when switch is clicked", async () => {
      const user = userEvent.setup();
      await renderWithProviders(<ModalTrigger />);

      await user.click(screen.getByRole("button", { name: /open modal/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /^sign up$/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /^sign up$/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /nice to meet you/i }),
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: /^log in$/i }),
        ).toBeInTheDocument();
      });
    });

    it("shows Name field only on Sign Up form", async () => {
      const user = userEvent.setup();
      await renderWithProviders(<ModalTrigger />);

      await user.click(screen.getByRole("button", { name: /open modal/i }));

      // Login form - no Name field
      await waitFor(() => {
        expect(screen.queryByLabelText(/name/i)).not.toBeInTheDocument();
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });

      // Switch to sign up
      await user.click(screen.getByRole("button", { name: /^sign up$/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      });
    });
  });

  describe("Login Form", () => {
    it("renders email and password fields", async () => {
      const user = userEvent.setup();
      await renderWithProviders(<ModalTrigger />);

      await user.click(screen.getByRole("button", { name: /open modal/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      });
    });

    it("renders submit button", async () => {
      const user = userEvent.setup();
      await renderWithProviders(<ModalTrigger />);

      await user.click(screen.getByRole("button", { name: /open modal/i }));

      await waitFor(() => {
        // Look for the submit button by type - CTA is "login"
        const submitButton = screen.getByRole("button", { name: /^log in$/i });
        expect(submitButton).toBeInTheDocument();
        expect(submitButton).toHaveAttribute("type", "submit");
      });
    });

    it("shows email error on blur with invalid email", async () => {
      const user = userEvent.setup();
      await renderWithProviders(<ModalTrigger />);

      await user.click(screen.getByRole("button", { name: /open modal/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/email/i), "invalid-email");

      await user.tab();

      await waitFor(() => {
        expect(
          screen.getByText(/please enter a valid email address/i),
        ).toBeInTheDocument();
      });
    });

    it("navigates to forgot password when link is clicked", async () => {
      const user = userEvent.setup();
      await renderWithProviders(<ModalTrigger />);

      await user.click(screen.getByRole("button", { name: /open modal/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /forgot password/i }),
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("button", { name: /forgot password/i }),
      );

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /reset password/i }),
        ).toBeInTheDocument();
      });
    });

    it("does not await Google import after email/password login", async () => {
      const user = userEvent.setup();
      await renderWithProviders(<ModalTrigger />);

      await user.click(screen.getByRole("button", { name: /open modal/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/email/i), "test@example.com");

      await user.type(screen.getByLabelText(/password/i), "password123");

      await user.click(screen.getByRole("button", { name: /^log in$/i }));

      await waitFor(() => {
        expect(mockCompleteAuthentication).toHaveBeenCalledWith(
          expect.objectContaining({
            email: "test@example.com",
          }),
        );
      });
    });
  });

  describe("Sign Up Form", () => {
    it("renders name, email, and password fields", async () => {
      const user = userEvent.setup();
      await renderWithProviders(<ModalTrigger />);

      await user.click(screen.getByRole("button", { name: /open modal/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /^sign up$/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /^sign up$/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      });
    });

    it("shows password error for short password", async () => {
      const user = userEvent.setup();
      await renderWithProviders(<ModalTrigger />);

      await user.click(screen.getByRole("button", { name: /open modal/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /^sign up$/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /^sign up$/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/password/i), "short");

      await user.tab();

      await waitFor(() => {
        expect(
          screen.getByText(/password must be at least 8 characters/i),
        ).toBeInTheDocument();
      });
    });

    it("updates greeting when user types name", async () => {
      const user = userEvent.setup();
      await renderWithProviders(<ModalTrigger />);

      await user.click(screen.getByRole("button", { name: /open modal/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /^sign up$/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /^sign up$/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /^nice to meet you$/i }),
        ).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/name/i), "Alex");

      await waitFor(() => {
        expect(
          screen.getByRole("heading", {
            name: /nice to meet you, alex/i,
          }),
        ).toBeInTheDocument();
      });
    });

    it("does not await Google import after email/password signup", async () => {
      const user = userEvent.setup();
      await renderWithProviders(<ModalTrigger />);

      await user.click(screen.getByRole("button", { name: /open modal/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /^sign up$/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /^sign up$/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/name/i), "Alex");

      await user.type(screen.getByLabelText(/email/i), "test@example.com");

      await user.type(screen.getByLabelText(/password/i), "password123");

      await user.click(screen.getByRole("button", { name: /^sign up$/i }));

      await waitFor(() => {
        expect(mockCompleteAuthentication).toHaveBeenCalledWith(
          expect.objectContaining({
            email: "test@example.com",
          }),
        );
      });
      expect(mockEmailPassword.signUp).toHaveBeenCalledWith({
        formFields: [
          { id: "name", value: "Alex" },
          { id: "email", value: "test@example.com" },
          { id: "password", value: "password123" },
        ],
      });
      expect(mockUpdateMetadata).not.toHaveBeenCalled();
    });

    it("subscribes to updates after sign-up when the checkbox is checked", async () => {
      const user = userEvent.setup();
      await renderWithProviders(<ModalTrigger />);

      await user.click(screen.getByRole("button", { name: /open modal/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /^sign up$/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /^sign up$/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/name/i), "Alex");
      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/password/i), "password123");
      await user.click(
        screen.getByRole("checkbox", { name: /subscribe to updates/i }),
      );
      await user.click(screen.getByRole("button", { name: /^sign up$/i }));

      await waitFor(() => {
        expect(mockUpdateMetadata).toHaveBeenCalledWith({
          subscribeToUpdates: true,
        });
      });
    });

    it("skips existing-session linking during email/password sign in", async () => {
      const user = userEvent.setup();
      await renderWithProviders(<ModalTrigger />);

      await user.click(screen.getByRole("button", { name: /open modal/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/password/i), "password123");
      await user.click(screen.getByRole("button", { name: /^log in$/i }));

      await waitFor(() => {
        expect(mockEmailPassword.signIn).toHaveBeenCalledWith({
          shouldTryLinkingWithSessionUser: false,
          formFields: [
            { id: "email", value: "test@example.com" },
            { id: "password", value: "password123" },
          ],
        });
      });
    });
  });

  describe("Forgot Password Form", () => {
    it("renders email field and instructions", async () => {
      const user = userEvent.setup();
      await renderWithProviders(<ModalTrigger />);

      await user.click(screen.getByRole("button", { name: /open modal/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /forgot password/i }),
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("button", { name: /forgot password/i }),
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(
          screen.getByText(/enter your email address/i),
        ).toBeInTheDocument();
      });
    });

    it("shows success message after submission", async () => {
      const user = userEvent.setup();
      await renderWithProviders(<ModalTrigger />);

      await user.click(screen.getByRole("button", { name: /open modal/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /forgot password/i }),
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("button", { name: /forgot password/i }),
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.click(
        screen.getByRole("button", { name: /send reset link/i }),
      );

      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      });
    });

    it("shows forgot password errors inline without the shared auth banner", async () => {
      mockEmailPassword.sendPasswordResetEmail.mockResolvedValue({
        status: "PASSWORD_RESET_NOT_ALLOWED",
        reason: "Password reset disabled",
      });

      const user = userEvent.setup();
      await renderWithProviders(<ModalTrigger />);

      await user.click(screen.getByRole("button", { name: /open modal/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /forgot password/i }),
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("button", { name: /forgot password/i }),
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.click(
        screen.getByRole("button", { name: /send reset link/i }),
      );

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(
          "Password reset disabled",
        );
      });

      expect(screen.queryByText(/check your email/i)).not.toBeInTheDocument();
      expect(screen.queryAllByText("Password reset disabled")).toHaveLength(1);
    });

    it("navigates back to sign in when link is clicked", async () => {
      const user = userEvent.setup();
      await renderWithProviders(<ModalTrigger />);

      await user.click(screen.getByRole("button", { name: /open modal/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /forgot password/i }),
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("button", { name: /forgot password/i }),
      );

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /back to sign in/i }),
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("button", { name: /back to sign in/i }),
      );

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /^sign up$/i }),
        ).toBeInTheDocument();
        expect(
          screen.getByRole("heading", { name: /hey, welcome back/i }),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Google Sign In", () => {
    it("renders Google sign in button", async () => {
      const user = userEvent.setup();
      await renderWithProviders(<ModalTrigger />);

      await user.click(screen.getByRole("button", { name: /open modal/i }));

      await waitFor(() => {
        const googleButton = screen.getByRole("button", {
          name: /continue with google/i,
        });
        expect(googleButton).toBeInTheDocument();
        expect(googleButton).toHaveTextContent(/continue with google/i);
      });
    });

    it("calls googleLogin when Google button is clicked", async () => {
      const user = userEvent.setup();
      await renderWithProviders(<ModalTrigger />);

      await user.click(screen.getByRole("button", { name: /open modal/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /continue with google/i }),
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("button", { name: /continue with google/i }),
      );

      expect(mockGoogleLogin).toHaveBeenCalled();
    });

    it("hides Google sign in when backend Google support is unavailable", async () => {
      const user = userEvent.setup();
      mockUseIsGoogleAvailable.mockReturnValue(false);
      await renderWithProviders(<ModalTrigger />);

      await user.click(screen.getByRole("button", { name: /open modal/i }));

      await waitFor(() => {
        expect(
          screen.queryByRole("button", { name: /continue with google/i }),
        ).not.toBeInTheDocument();
      });
    });

    it("keeps consistent button label when switching views", async () => {
      const user = userEvent.setup();
      await renderWithProviders(<ModalTrigger />);

      await user.click(screen.getByRole("button", { name: /open modal/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /continue with google/i }),
        ).toHaveTextContent(/continue with google/i);
      });

      await user.click(screen.getByRole("button", { name: /^sign up$/i }));

      // Google button label stays consistent as "Continue with Google"
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /continue with google/i }),
        ).toHaveTextContent(/continue with google/i);
      });
    });
  });

  describe("Privacy and Terms Links", () => {
    it("renders privacy and terms links", async () => {
      const user = userEvent.setup();
      await renderWithProviders(<ModalTrigger />);

      await user.click(screen.getByRole("button", { name: /open modal/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("link", { name: /terms/i }),
        ).toBeInTheDocument();
        expect(
          screen.getByRole("link", { name: /privacy/i }),
        ).toBeInTheDocument();
      });
    });

    it("links open in new tab", async () => {
      const user = userEvent.setup();
      await renderWithProviders(<ModalTrigger />);

      await user.click(screen.getByRole("button", { name: /open modal/i }));

      await waitFor(() => {
        const termsLink = screen.getByRole("link", {
          name: /terms/i,
        });
        const privacyLink = screen.getByRole("link", {
          name: /privacy/i,
        });

        expect(termsLink).toHaveAttribute("target", "_blank");
        expect(privacyLink).toHaveAttribute("target", "_blank");
        expect(termsLink).toHaveAttribute("rel", "noopener noreferrer");
        expect(privacyLink).toHaveAttribute("rel", "noopener noreferrer");
      });
    });
  });
});

describe("URL Parameter Support", () => {
  beforeEach(() => {
    mockUseSession.mockClear();
    mockGoogleLogin.mockClear();
    mockCompleteAuthentication.mockClear();
    mockEmailPassword.signUp.mockClear();
    mockEmailPassword.signIn.mockClear();
    mockEmailPassword.sendPasswordResetEmail.mockClear();
    mockEmailPassword.getResetPasswordTokenFromURL.mockClear();
    mockEmailPassword.submitNewPassword.mockClear();
    mockUseSession.mockReturnValue({
      authenticated: false,
      setAuthenticated: mock(),
    });
    mockEmailPassword.submitNewPassword.mockResolvedValue({
      status: "OK",
    });
  });

  it("opens sign in modal when ?auth=login is present", async () => {
    await renderWithProviders(<div />, "/?auth=login");

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /hey, welcome back/i }),
      ).toBeInTheDocument();
    });
  });

  it("opens sign up modal when ?auth=signup is present", async () => {
    await renderWithProviders(<div />, "/?auth=signup");

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /nice to meet you/i }),
      ).toBeInTheDocument();
    });
  });

  it("opens forgot password modal when ?auth=forgot is present", async () => {
    await renderWithProviders(<div />, "/?auth=forgot");

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /reset password/i }),
      ).toBeInTheDocument();
    });
  });

  it("handles case-insensitive param values", async () => {
    await renderWithProviders(<div />, "/?auth=LOGIN");

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /hey, welcome back/i }),
      ).toBeInTheDocument();
    });
  });

  it("does not open modal for invalid param value", async () => {
    await renderWithProviders(<div />, "/?auth=invalid");

    // Give it time to potentially open (it shouldn't)
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(
      screen.queryByRole("heading", { name: /hey, welcome back/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /nice to meet you/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /reset password/i }),
    ).not.toBeInTheDocument();
  });

  it("works on different routes", async () => {
    await renderWithProviders(<div />, "/week?auth=signup");

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /nice to meet you/i }),
      ).toBeInTheDocument();
    });
  });

  it("preserves an unrelated search param across a modal open/close round-trip", async () => {
    const user = userEvent.setup();
    const { router } = await renderWithProviders(
      <ModalTrigger />,
      "/?ref=newsletter",
    );

    await user.click(screen.getByRole("button", { name: /open modal/i }));
    await flushEffects();
    await waitFor(() => {
      expect(router.state.location.search as Record<string, unknown>).toEqual({
        ref: "newsletter",
        auth: "login",
      });
    });

    const backdrop = screen.getByRole("presentation");
    await act(async () => {
      backdrop.focus();
    });
    await user.keyboard("{Escape}");
    await flushEffects();

    await waitFor(() => {
      expect(router.state.location.search as Record<string, unknown>).toEqual({
        ref: "newsletter",
      });
    });
  });

  it("opens reset password after the /day redirect preserves auth params", async () => {
    const { dateString } = loadTodayData();

    const { router } = renderWithDayRedirectRoute(
      "/day?auth=reset&token=reset-token",
    );

    await waitFor(() => {
      expect(screen.getByText("Day route loaded")).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: /set new password/i }),
      ).toBeInTheDocument();
    });

    // The ?auth param stays in the URL while the modal is open (URL is the
    // modal's source of truth), so the redirect preserves both params
    expect(router.state.location.pathname).toBe(`/day/${dateString}`);
    expect(router.state.location.search).toEqual({
      auth: "reset",
      token: "reset-token",
    });
  });

  it("submits reset password with the initial token after the URL changes", async () => {
    const user = userEvent.setup();
    const { router } = await renderWithProviders(
      <div />,
      "/day?auth=reset&token=reset-token",
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /set new password/i }),
      ).toBeInTheDocument();
    });

    // Simulate something else clearing the token param out from under the
    // modal (auth stays "reset" so the modal itself stays open) before the
    // user finishes the form.
    await act(async () => {
      await router.navigate({
        to: ".",
        search: (prev) => ({ auth: prev.auth }),
      });
    });

    await user.type(
      screen.getByLabelText(/^new password$/i),
      "updatedpassword",
    );
    await user.click(screen.getByRole("button", { name: /set new password/i }));

    await waitFor(() => {
      expect(mockEmailPassword.submitNewPassword).toHaveBeenCalledWith({
        formFields: [{ id: "password", value: "updatedpassword" }],
      });
    });

    await waitFor(() => {
      expect(router.state.location.search.token).toBeUndefined();
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Password reset successful. Log in with your new password.",
    );
    expect(
      screen.getByRole("heading", { name: /hey, welcome back/i }),
    ).toBeInTheDocument();
    expect(mockCompleteAuthentication).not.toHaveBeenCalled();
    expect(
      mockEmailPassword.getResetPasswordTokenFromURL,
    ).not.toHaveBeenCalled();
  });

  it("switches to signUp (not back to loginAfterReset) when Sign up is clicked after reset", async () => {
    const user = userEvent.setup();
    mockEmailPassword.submitNewPassword.mockResolvedValue({
      status: "OK",
    });
    await renderWithProviders(<div />, "/day?auth=reset&token=reset-token");

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /set new password/i }),
      ).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/^new password$/i), "newpassword123");
    await user.click(screen.getByRole("button", { name: /set new password/i }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "Password reset successful. Log in with your new password.",
      );
    });

    await user.click(screen.getByRole("button", { name: /^sign up$/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /nice to meet you/i }),
      ).toBeInTheDocument();
    });
  });
});
