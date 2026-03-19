import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { ResetPasswordForm } from "./ResetPasswordForm";

describe("ResetPasswordForm", () => {
  it("autofocuses the new password field on mount", () => {
    render(
      <ResetPasswordForm
        onSubmit={jest.fn()}
        onBackToForgotPassword={jest.fn()}
      />,
    );

    expect(screen.getByLabelText(/new password/i)).toHaveFocus();
  });
});
