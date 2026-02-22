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
    <div onClick={onClick} title={description}>
      {description && <span>{description}</span>}
      {children}
    </div>
  ),
}));

// Helper component to trigger modal open
const ModalTrigger = () => {
  const { openModal } = useAuthModal();
  return <button onClick={() => openModal("signIn")}>Open Modal</button>;
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
        screen.queryByRole("heading", { name: /welcome to compass/i }),
      ).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /open modal/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /welcome to compass/i }),
        ).toBeInTheDocument();
      });
    });

    it("closes modal when backdrop is clicked", async () => {
      const user = userEvent.setup();
      renderWithProviders(<ModalTrigger />);

      await user.click(screen.getByRole("button", { name: /open modal/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /welcome to compass/i }),
        ).toBeInTheDocument();
      });

      // Click on backdrop using semantic role query
      const backdrop = screen.getByRole("presentation");
      expect(backdrop).toBeInTheDocument();

      await user.click(backdrop);

      await waitFor(() => {
        expect(
          screen.queryByRole("heading", { name: /welcome to compass/i }),
        ).not.toBeInTheDocument();
      });
    });

    it("closes modal when Escape key is pressed", async () => {
      const user = userEvent.setup();
      renderWithProviders(<ModalTrigger />);

      await user.click(screen.getByRole("button", { name: /open modal/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /welcome to compass/i }),
        ).toBeInTheDocument();
      });

      // Focus the backdrop so it can receive keyboard events
      const backdrop = screen.getByRole("presentation");
      backdrop.focus();

      await user.keyboard("{Escape}");

      await waitFor(() => {
        expect(
          screen.queryByRole("heading", { name: /welcome to compass/i }),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("Tab Navigation", () => {
    it("shows Sign In tab as active by default", async () => {
      const user = userEvent.setup();
      renderWithProviders(<ModalTrigger />);

      await user.click(screen.getByRole("button", { name: /open modal/i }));

      await waitFor(() => {
        const signInTab = screen.getByRole("tab", { name: /sign in/i });
        expect(signInTab).toHaveAttribute("aria-selected", "true");
      });
    });

    it("switches to Sign Up tab when clicked", async () => {
      const user = userEvent.setup();
      renderWithProviders(<ModalTrigger />);

      await user.click(screen.getByRole("button", { name: /open modal/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("tab", { name: /sign up/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("tab", { name: /sign up/i }));

      await waitFor(() => {
        const signUpTab = screen.getByRole("tab", { name: /sign up/i });
        expect(signUpTab).toHaveAttribute("aria-selected", "true");
      });
    });

    it("shows Name field only on Sign Up form", async () => {
      const user = userEvent.setup();
      renderWithProviders(<ModalTrigger />);

      await user.click(screen.getByRole("button", { name: /open modal/i }));

      // Sign In tab - no Name field
      await waitFor(() => {
        expect(screen.queryByLabelText(/name/i)).not.toBeInTheDocument();
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });

      // Switch to Sign Up
      await user.click(screen.getByRole("tab", { name: /sign up/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      });
    });
  });

  describe("Sign In Form", () => {
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
        // Look for the submit button by type - CTA is "Enter" per spec
        const submitButton = screen.getByRole("button", { name: /^enter$/i });
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
      await user.click(screen.getByRole("tab", { name: /sign up/i }));

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
      await user.click(screen.getByRole("tab", { name: /sign up/i }));

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
          screen.getByRole("tab", { name: /sign in/i }),
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
          name: /sign in with google/i,
        });
        expect(googleButton).toBeInTheDocument();
        expect(googleButton).toHaveTextContent(/sign in with google/i);
      });
    });

    it("calls googleLogin when Google button is clicked", async () => {
      const user = userEvent.setup();
      renderWithProviders(<ModalTrigger />);

      await user.click(screen.getByRole("button", { name: /open modal/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /sign in with google/i }),
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("button", { name: /sign in with google/i }),
      );

      expect(mockGoogleLogin).toHaveBeenCalled();
    });

    it("keeps consistent button label across tabs", async () => {
      const user = userEvent.setup();
      renderWithProviders(<ModalTrigger />);

      await user.click(screen.getByRole("button", { name: /open modal/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /sign in with google/i }),
        ).toHaveTextContent(/sign in with google/i);
      });

      await user.click(screen.getByRole("tab", { name: /sign up/i }));

      // Google button label stays consistent as "Sign in with Google" per spec
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /sign in with google/i }),
        ).toHaveTextContent(/sign in with google/i);
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

describe("AccountIcon", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders when user is not authenticated and feature flag is enabled", async () => {
    mockUseSession.mockReturnValue({
      authenticated: false,
      setAuthenticated: jest.fn(),
    });

    renderWithProviders(<AccountIcon />, "/day?enableAuth=true");

    await waitFor(() => {
      expect(screen.getByLabelText(/log in/i)).toBeInTheDocument();
    });
  });

  it("shows 'Log in' when user is not authenticated", () => {
    mockUseSession.mockReturnValue({
      authenticated: false,
      setAuthenticated: jest.fn(),
    });

    renderWithProviders(<AccountIcon />, "/day?enableAuth=true");

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

    renderWithProviders(<AccountIcon />, "/day?enableAuth=true");

    await waitFor(() => {
      expect(screen.getByLabelText(/log in/i)).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText(/log in/i));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /welcome to compass/i }),
      ).toBeInTheDocument();
    });
  });
});
