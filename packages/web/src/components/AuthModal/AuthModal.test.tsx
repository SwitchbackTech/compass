import { ReactElement, ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccountIcon } from "./AccountIcon";
import { AuthModal } from "./AuthModal";
import { AuthModalProvider } from "./AuthModalProvider";
import { useAuthModal } from "./hooks/useAuthModal";

// Mock useSession
const mockUseSession = jest.fn(() => ({
  authenticated: false,
  setAuthenticated: jest.fn(),
}));

jest.mock("@web/auth/hooks/session/useSession", () => ({
  useSession: () => mockUseSession(),
}));

// Mock useGoogleAuth
const mockGoogleLogin = jest.fn();
jest.mock("@web/auth/hooks/oauth/useGoogleAuth", () => ({
  useGoogleAuth: () => ({
    login: mockGoogleLogin,
  }),
}));

// Mock GoogleButton - uses button with label for semantic queries (matches real component's aria-label)
jest.mock("@web/components/oauth/google/GoogleButton", () => ({
  GoogleButton: ({
    onClick,
    label,
  }: {
    onClick: () => void;
    label: string;
  }) => (
    <button onClick={onClick} aria-label={label}>
      {label}
    </button>
  ),
}));

// Mock TooltipWrapper - no data-testid; use semantic queries (role/name/text)
jest.mock("@web/components/Tooltip/TooltipWrapper", () => ({
  TooltipWrapper: ({
    children,
    onClick,
    description,
  }: {
    children: ReactNode;
    onClick?: () => void;
    description?: string;
  }) => (
    <div
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e: React.KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? "button" : undefined}
      title={description}
    >
      {description && <span>{description}</span>}
      {children}
    </div>
  ),
}));

// Helper component to trigger modal open
const ModalTrigger = () => {
  const { openModal } = useAuthModal();
  return <button onClick={() => openModal("login")}>Open Modal</button>;
};

const renderWithProviders = (
  component: ReactElement,
  initialRoute: string = "/day",
) => {
  return render(
    <MemoryRouter
      initialEntries={[initialRoute]}
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AuthModalProvider>
        {component}
        <AuthModal />
      </AuthModalProvider>
    </MemoryRouter>,
  );
};

describe("AuthModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSession.mockReturnValue({
      authenticated: false,
      setAuthenticated: jest.fn(),
    });
  });

  describe("Modal Open/Close", () => {
    it("opens modal when triggered", async () => {
      const user = userEvent.setup();
      renderWithProviders(<ModalTrigger />);

      expect(
        screen.queryByRole("heading", { name: /hey, welcome back/i }),
      ).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /open modal/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /hey, welcome back/i }),
        ).toBeInTheDocument();
      });
    });

    it("closes modal when backdrop is clicked", async () => {
      const user = userEvent.setup();
      renderWithProviders(<ModalTrigger />);

      await user.click(screen.getByRole("button", { name: /open modal/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /hey, welcome back/i }),
        ).toBeInTheDocument();
      });

      // Click on backdrop using semantic role query
      const backdrop = screen.getByRole("presentation");
      expect(backdrop).toBeInTheDocument();

      await user.click(backdrop);

      await waitFor(() => {
        expect(
          screen.queryByRole("heading", { name: /hey, welcome back/i }),
        ).not.toBeInTheDocument();
      });
    });

    it("closes modal when Escape key is pressed", async () => {
      const user = userEvent.setup();
      renderWithProviders(<ModalTrigger />);

      await user.click(screen.getByRole("button", { name: /open modal/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /hey, welcome back/i }),
        ).toBeInTheDocument();
      });

      // Focus the backdrop so it can receive keyboard events
      const backdrop = screen.getByRole("presentation");
      backdrop.focus();

      await user.keyboard("{Escape}");

      await waitFor(() => {
        expect(
          screen.queryByRole("heading", { name: /hey, welcome back/i }),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("Auth view switching", () => {
    it("shows sign up when on sign in form", async () => {
      const user = userEvent.setup();
      renderWithProviders(<ModalTrigger />);

      await user.click(screen.getByRole("button", { name: /open modal/i }));

      await waitFor(() => {
        const signUpSwitch = screen.getByRole("button", { name: /^sign up$/i });
        expect(signUpSwitch).toBeInTheDocument();
      });
    });

    it("switches to Sign Up form when switch is clicked", async () => {
      const user = userEvent.setup();
      renderWithProviders(<ModalTrigger />);

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
      renderWithProviders(<ModalTrigger />);

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
      renderWithProviders(<ModalTrigger />);

      await user.click(screen.getByRole("button", { name: /open modal/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      });
    });

    it("renders submit button", async () => {
      const user = userEvent.setup();
      renderWithProviders(<ModalTrigger />);

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
      renderWithProviders(<ModalTrigger />);

      await user.click(screen.getByRole("button", { name: /open modal/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/email/i), "invalid-email");
      await user.tab(); // Blur the field

      await waitFor(() => {
        expect(
          screen.getByText(/please enter a valid email address/i),
        ).toBeInTheDocument();
      });
    });

    it("navigates to forgot password when link is clicked", async () => {
      const user = userEvent.setup();
      renderWithProviders(<ModalTrigger />);

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
  });

  describe("Sign Up Form", () => {
    it("renders name, email, and password fields", async () => {
      const user = userEvent.setup();
      renderWithProviders(<ModalTrigger />);

      await user.click(screen.getByRole("button", { name: /open modal/i }));
      await user.click(screen.getByRole("button", { name: /^sign up$/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      });
    });

    it("shows password error for short password", async () => {
      const user = userEvent.setup();
      renderWithProviders(<ModalTrigger />);

      await user.click(screen.getByRole("button", { name: /open modal/i }));
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
      renderWithProviders(<ModalTrigger />);

      await user.click(screen.getByRole("button", { name: /open modal/i }));
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
  });

  describe("Forgot Password Form", () => {
    it("renders email field and instructions", async () => {
      const user = userEvent.setup();
      renderWithProviders(<ModalTrigger />);

      await user.click(screen.getByRole("button", { name: /open modal/i }));
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
      renderWithProviders(<ModalTrigger />);

      await user.click(screen.getByRole("button", { name: /open modal/i }));
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

    it("navigates back to sign in when link is clicked", async () => {
      const user = userEvent.setup();
      renderWithProviders(<ModalTrigger />);

      await user.click(screen.getByRole("button", { name: /open modal/i }));
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
      renderWithProviders(<ModalTrigger />);

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
      renderWithProviders(<ModalTrigger />);

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

    it("keeps consistent button label when switching views", async () => {
      const user = userEvent.setup();
      renderWithProviders(<ModalTrigger />);

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
      renderWithProviders(<ModalTrigger />);

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
      renderWithProviders(<ModalTrigger />);

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

// Helper to mock window.location for URL param tests
const mockWindowLocation = (url: string) => {
  const urlObj = new URL(url, "http://localhost");
  Object.defineProperty(window, "location", {
    value: {
      pathname: urlObj.pathname,
      search: urlObj.search,
      hash: urlObj.hash,
      href: urlObj.href,
    },
    writable: true,
    configurable: true,
  });
};

// Mock history.replaceState for URL param tests
const mockReplaceState = jest.fn();
const originalHistory = window.history;

describe("URL Parameter Support", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSession.mockReturnValue({
      authenticated: false,
      setAuthenticated: jest.fn(),
    });
    // Mock history.replaceState
    Object.defineProperty(window, "history", {
      value: { ...originalHistory, replaceState: mockReplaceState },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    // Reset window.location to default
    mockWindowLocation("/day");
    // Restore original history
    Object.defineProperty(window, "history", {
      value: originalHistory,
      writable: true,
      configurable: true,
    });
  });

  it("opens sign in modal when ?auth=login is present", async () => {
    mockWindowLocation("/?auth=login");
    renderWithProviders(<div />, "/?auth=login");

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /hey, welcome back/i }),
      ).toBeInTheDocument();
    });
  });

  it("opens sign up modal when ?auth=signup is present", async () => {
    mockWindowLocation("/?auth=signup");
    renderWithProviders(<div />, "/?auth=signup");

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /nice to meet you/i }),
      ).toBeInTheDocument();
    });
  });

  it("opens forgot password modal when ?auth=forgot is present", async () => {
    mockWindowLocation("/?auth=forgot");
    renderWithProviders(<div />, "/?auth=forgot");

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /reset password/i }),
      ).toBeInTheDocument();
    });
  });

  it("handles case-insensitive param values", async () => {
    mockWindowLocation("/?auth=LOGIN");
    renderWithProviders(<div />, "/?auth=LOGIN");

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /hey, welcome back/i }),
      ).toBeInTheDocument();
    });
  });

  it("does not open modal for invalid param value", async () => {
    mockWindowLocation("/?auth=invalid");
    renderWithProviders(<div />, "/?auth=invalid");

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

  it("implicitly enables auth feature when ?auth param is present", async () => {
    mockWindowLocation("/?auth=signup");
    renderWithProviders(<AccountIcon />, "/?auth=signup");

    await waitFor(() => {
      // The auth modal should open
      expect(
        screen.getByRole("heading", { name: /nice to meet you/i }),
      ).toBeInTheDocument();
    });
  });

  it("works on different routes", async () => {
    mockWindowLocation("/week?auth=signup");
    renderWithProviders(<div />, "/week?auth=signup");

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /nice to meet you/i }),
      ).toBeInTheDocument();
    });
  });
});

describe("AccountIcon", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders when user is not authenticated and feature flag is enabled", async () => {
    mockUseSession.mockReturnValue({
      authenticated: false,
      setAuthenticated: jest.fn(),
    });

    renderWithProviders(<AccountIcon />, "/day?auth=signup");

    await waitFor(() => {
      expect(screen.getByLabelText(/log in/i)).toBeInTheDocument();
    });
  });

  it("shows 'Log in' when user is not authenticated", () => {
    mockUseSession.mockReturnValue({
      authenticated: false,
      setAuthenticated: jest.fn(),
    });

    renderWithProviders(<AccountIcon />, "/day?auth=signup");

    expect(screen.getByText("Log in")).toBeInTheDocument();
  });

  it("does not render when feature flag is disabled", () => {
    mockUseSession.mockReturnValue({
      authenticated: false,
      setAuthenticated: jest.fn(),
    });

    renderWithProviders(<AccountIcon />, "/day");

    expect(screen.queryByLabelText(/log in/i)).not.toBeInTheDocument();
  });

  it("opens modal when clicked", async () => {
    const user = userEvent.setup();
    mockUseSession.mockReturnValue({
      authenticated: false,
      setAuthenticated: jest.fn(),
    });

    renderWithProviders(<AccountIcon />, "/day?auth=signup");

    await waitFor(() => {
      expect(screen.getByLabelText(/log in/i)).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText(/log in/i));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /hey, welcome back/i }),
      ).toBeInTheDocument();
    });
  });
});
