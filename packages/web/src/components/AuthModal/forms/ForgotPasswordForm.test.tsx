import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

const mockOnSubmit = jest.fn();
const mockOnBackToSignIn = jest.fn();

const renderForgotPasswordForm = () => {
  render(
    <ForgotPasswordForm
      onSubmit={mockOnSubmit}
      onBackToSignIn={mockOnBackToSignIn}
    />,
  );
};

describe("ForgotPasswordForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("blur-only validation", () => {
    it("does not show email error while user is typing", async () => {
      const user = userEvent.setup();
      renderForgotPasswordForm();

      const emailInput = screen.getByLabelText(/email/i);
      await user.click(emailInput);
      await user.type(emailInput, "invalid");

      expect(
        screen.queryByText(/please enter a valid email address/i),
      ).not.toBeInTheDocument();
    });

    it("shows email error only after blur", async () => {
      const user = userEvent.setup();
      renderForgotPasswordForm();

      await user.type(screen.getByLabelText(/email/i), "invalid-email");
      await user.tab();

      await waitFor(() => {
        expect(
          screen.getByText(/please enter a valid email address/i),
        ).toBeInTheDocument();
      });
    });

    it("clears email error when user types after blur", async () => {
      const user = userEvent.setup();
      renderForgotPasswordForm();

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, "invalid");
      await user.tab();

      await waitFor(() => {
        expect(
          screen.getByText(/please enter a valid email address/i),
        ).toBeInTheDocument();
      });

      await user.click(emailInput);
      await user.type(emailInput, "@example.com");

      await waitFor(() => {
        expect(
          screen.queryByText(/please enter a valid email address/i),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("submit validation", () => {
    it("shows email error when submitting empty form", async () => {
      renderForgotPasswordForm();

      const form = screen.getByLabelText(/email/i).closest("form");
      if (form) fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });
    });

    it("shows email format error when submitting invalid email", async () => {
      const user = userEvent.setup();
      renderForgotPasswordForm();

      await user.type(screen.getByLabelText(/email/i), "not-an-email");
      await user.click(
        screen.getByRole("button", { name: /send reset link/i }),
      );

      await waitFor(() => {
        expect(
          screen.getByText(/please enter a valid email address/i),
        ).toBeInTheDocument();
      });
    });

    it("does not call onSubmit when form is invalid", () => {
      renderForgotPasswordForm();

      const form = screen.getByLabelText(/email/i).closest("form");
      if (form) fireEvent.submit(form);

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("calls onSubmit and shows success message when form is valid", async () => {
      const user = userEvent.setup();
      renderForgotPasswordForm();

      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.click(
        screen.getByRole("button", { name: /send reset link/i }),
      );

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          email: "test@example.com",
        });
      });

      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      });
    });
  });

  describe("submit button state", () => {
    it("disables submit when email is empty", async () => {
      renderForgotPasswordForm();

      const submitButton = screen.getByRole("button", {
        name: /send reset link/i,
      });
      expect(submitButton).toBeDisabled();
    });

    it("enables submit when email is valid", async () => {
      const user = userEvent.setup();
      renderForgotPasswordForm();

      await user.type(screen.getByLabelText(/email/i), "test@example.com");

      const submitButton = screen.getByRole("button", {
        name: /send reset link/i,
      });
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe("success state", () => {
    it("shows submitted email in success message", async () => {
      const user = userEvent.setup();
      renderForgotPasswordForm();

      await user.type(screen.getByLabelText(/email/i), "user@example.com");
      await user.click(
        screen.getByRole("button", { name: /send reset link/i }),
      );

      await waitFor(() => {
        expect(
          screen.getByText(/if an account exists for user@example.com/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe("back to sign in", () => {
    it("calls onBackToSignIn when back to sign in is clicked", async () => {
      const user = userEvent.setup();
      renderForgotPasswordForm();

      await user.click(
        screen.getByRole("button", { name: /back to sign in/i }),
      );

      expect(mockOnBackToSignIn).toHaveBeenCalled();
    });
  });
});
