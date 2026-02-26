import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LogInForm } from "./LogInForm";

const mockOnSubmit = jest.fn();
const mockOnForgotPassword = jest.fn();

const renderSignInForm = () => {
  render(
    <LogInForm
      onSubmit={mockOnSubmit}
      onForgotPassword={mockOnForgotPassword}
    />,
  );
};

describe("LogInForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("blur-only validation", () => {
    it("does not show email error while user is typing", async () => {
      const user = userEvent.setup();
      renderSignInForm();

      const emailInput = screen.getByLabelText(/email/i);
      await user.click(emailInput);
      await user.type(emailInput, "invalid");

      expect(
        screen.queryByText(/please enter a valid email address/i),
      ).not.toBeInTheDocument();
    });

    it("shows email error only after blur", async () => {
      const user = userEvent.setup();
      renderSignInForm();

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
      renderSignInForm();

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
    it("shows all field errors when submitting invalid form", async () => {
      renderSignInForm();

      const form = screen.getByLabelText(/email/i).closest("form");
      if (form) fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });

    it("does not call onSubmit when form is invalid", () => {
      renderSignInForm();

      const form = screen.getByLabelText(/email/i).closest("form");
      if (form) fireEvent.submit(form);

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("calls onSubmit with valid data when form is valid", async () => {
      const user = userEvent.setup();
      renderSignInForm();

      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/password/i), "password123");
      await user.click(screen.getByRole("button", { name: /^log in$/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          email: "test@example.com",
          password: "password123",
        });
      });
    });

    it("normalizes email to lowercase on submit", async () => {
      const user = userEvent.setup();
      renderSignInForm();

      await user.type(screen.getByLabelText(/email/i), "Test@Example.COM");
      await user.type(screen.getByLabelText(/password/i), "password123");
      await user.click(screen.getByRole("button", { name: /^log in$/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          email: "test@example.com",
          password: "password123",
        });
      });
    });
  });

  describe("submit button state", () => {
    it("disables submit when form is invalid", async () => {
      renderSignInForm();

      const submitButton = screen.getByRole("button", { name: /^log in$/i });
      expect(submitButton).toBeDisabled();
    });

    it("enables submit when all fields are valid", async () => {
      const user = userEvent.setup();
      renderSignInForm();

      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/password/i), "password123");

      const submitButton = screen.getByRole("button", { name: /^log in$/i });
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe("forgot password link", () => {
    it("calls onForgotPassword when forgot password link is clicked", async () => {
      const user = userEvent.setup();
      renderSignInForm();

      await user.click(
        screen.getByRole("button", { name: /forgot password/i }),
      );

      expect(mockOnForgotPassword).toHaveBeenCalled();
    });
  });
});
