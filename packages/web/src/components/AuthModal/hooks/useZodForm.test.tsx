import React from "react";
import { z } from "zod";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useZodForm } from "./useZodForm";

const testSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email"),
  name: z.string().min(1, "Name is required"),
});

type TestFormValues = z.infer<typeof testSchema>;

function TestForm() {
  const form = useZodForm<TestFormValues>({
    schema: testSchema,
    initialValues: { email: "", name: "" },
    onSubmit: () => {},
  });

  return (
    <form onSubmit={form.handleSubmit}>
      <input
        aria-label="Email"
        value={form.values.email}
        onChange={form.handleChange("email")}
        onBlur={form.handleBlur("email")}
      />
      {form.touched.email && form.errors.email && (
        <span role="alert">{form.errors.email}</span>
      )}
      <input
        aria-label="Name"
        value={form.values.name}
        onChange={form.handleChange("name")}
        onBlur={form.handleBlur("name")}
      />
      {form.touched.name && form.errors.name && (
        <span role="alert">{form.errors.name}</span>
      )}
      <button type="submit" disabled={!form.isValid}>
        Submit
      </button>
    </form>
  );
}

describe("useZodForm", () => {
  it("validates on blur only - no error while typing", async () => {
    const user = userEvent.setup();
    render(<TestForm />);

    await user.type(screen.getByLabelText(/email/i), "invalid");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows error after blur when field has invalid value", async () => {
    const user = userEvent.setup();
    render(<TestForm />);

    await user.type(screen.getByLabelText(/email/i), "invalid");
    await user.tab();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/invalid email/i);
    });
  });

  it("clears error when user types after blur", async () => {
    const user = userEvent.setup();
    render(<TestForm />);

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, "invalid");
    await user.tab();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/invalid email/i);
    });

    await user.click(emailInput);
    await user.type(emailInput, "@example.com");

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  it("shows all errors on submit when form is invalid", async () => {
    render(<TestForm />);

    const form = screen.getByLabelText(/email/i).closest("form");
    if (form) fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
  });

  it("disables submit when form is invalid", () => {
    render(<TestForm />);
    expect(screen.getByRole("button", { name: /submit/i })).toBeDisabled();
  });

  it("enables submit when form is valid", async () => {
    const user = userEvent.setup();
    render(<TestForm />);

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/name/i), "Alex");

    expect(screen.getByRole("button", { name: /submit/i })).not.toBeDisabled();
  });
});
