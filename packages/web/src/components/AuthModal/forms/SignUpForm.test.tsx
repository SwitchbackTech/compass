import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignUpForm } from "./SignUpForm";

const mockOnSubmit = jest.fn();
const mockOnNameChange = jest.fn();

const renderSignUpForm = (props?: {
  onNameChange?: (name: string) => void;
}) => {
  render(
    <SignUpForm
      onSubmit={mockOnSubmit}
      onNameChange={props?.onNameChange ?? mockOnNameChange}
    />,
  );
};

describe("SignUpForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("blur-only validation", () => {
    it("does not show email error while user is typing", async () => {
      const user = userEvent.setup();
      renderSignUpForm();

      const emailInput = screen.getByLabelText(/email/i);
      await user.click(emailInput);
      await user.type(emailInput, "invalid");

      expect(
        screen.queryByText(/please enter a valid email address/i),
      ).not.toBeInTheDocument();
    });

    it("shows email error only after blur", async () => {
      const user = userEvent.setup();
      renderSignUpForm();

      await user.type(screen.getByLabelText(/email/i), "invalid-email");
      await user.tab();

      await waitFor(() => {
        expect(
          screen.getByText(/please enter a valid email address/i),
        ).toBeInTheDocument();
      });
    });

    it("shows password error only after blur", async () => {
      const user = userEvent.setup();
      renderSignUpForm();

      await user.type(screen.getByLabelText(/password/i), "short");
      await user.tab();

      await waitFor(() => {
        expect(
          screen.getByText(/password must be at least 8 characters/i),
        ).toBeInTheDocument();
      });
    });

    it("clears error when user types after blur", async () => {
      const user = userEvent.setup();
      renderSignUpForm();

      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(passwordInput, "short");
      await user.tab();

      await waitFor(() => {
        expect(
          screen.getByText(/password must be at least 8 characters/i),
        ).toBeInTheDocument();
      });

      await user.click(passwordInput);
      await user.type(passwordInput, "er123456");

      await waitFor(() => {
        expect(
          screen.queryByText(/password must be at least 8 characters/i),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("submit validation", () => {
    it("shows all field errors when submitting empty form", async () => {
      renderSignUpForm();

      const form = screen.getByLabelText(/name/i).closest("form");
      if (form) fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });

    it("does not call onSubmit when form is invalid", async () => {
      const user = userEvent.setup();
      renderSignUpForm();

      await user.type(screen.getByLabelText(/name/i), "Alex");
      await user.type(screen.getByLabelText(/email/i), "invalid");
      await user.type(screen.getByLabelText(/password/i), "short");

      const form = screen.getByLabelText(/name/i).closest("form");
      if (form) fireEvent.submit(form);

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("calls onSubmit with valid data when form is valid", async () => {
      const user = userEvent.setup();
      renderSignUpForm();

      await user.type(screen.getByLabelText(/name/i), "Alex Smith");
      await user.type(screen.getByLabelText(/email/i), "alex@example.com");
      await user.type(screen.getByLabelText(/password/i), "securepass123");
      await user.click(screen.getByRole("button", { name: /sign up/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: "Alex Smith",
          email: "alex@example.com",
          password: "securepass123",
        });
      });
    });

    it("trims and lowercases values on submit", async () => {
      const user = userEvent.setup();
      renderSignUpForm();

      await user.type(screen.getByLabelText(/name/i), "  Alex  ");
      await user.type(screen.getByLabelText(/email/i), "  Alex@Example.COM  ");
      await user.type(screen.getByLabelText(/password/i), "password123");
      await user.click(screen.getByRole("button", { name: /sign up/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: "Alex",
          email: "alex@example.com",
          password: "password123",
        });
      });
    });
  });

  describe("submit button state", () => {
    it("disables submit when form is invalid", async () => {
      renderSignUpForm();

      const submitButton = screen.getByRole("button", {
        name: /sign up/i,
      });
      expect(submitButton).toBeDisabled();
    });

    it("enables submit when all fields are valid", async () => {
      const user = userEvent.setup();
      renderSignUpForm();

      await user.type(screen.getByLabelText(/name/i), "Alex");
      await user.type(screen.getByLabelText(/email/i), "alex@example.com");
      await user.type(screen.getByLabelText(/password/i), "password123");

      const submitButton = screen.getByRole("button", {
        name: /sign up/i,
      });
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe("onNameChange callback", () => {
    it("calls onNameChange when name field changes", async () => {
      const user = userEvent.setup();
      renderSignUpForm();

      await user.type(screen.getByLabelText(/name/i), "Alex");

      expect(mockOnNameChange).toHaveBeenCalledWith("A");
      expect(mockOnNameChange).toHaveBeenCalledWith("Al");
      expect(mockOnNameChange).toHaveBeenCalledWith("Ale");
      expect(mockOnNameChange).toHaveBeenCalledWith("Alex");
    });
  });
});
