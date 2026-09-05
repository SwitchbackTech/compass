import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignInProviderButtons } from "@web/components/AuthModal/components/SignInProviderButtons";
import { describe, expect, it, mock } from "bun:test";

describe("SignInProviderButtons", () => {
  it("renders all three provider buttons with whole-string labels", () => {
    render(
      <SignInProviderButtons
        available={["google", "microsoft", "apple"]}
        loadingKind={null}
        onSignIn={mock()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Continue with Google" }),
    ).toHaveTextContent("Continue with Google");
    expect(
      screen.getByRole("button", { name: "Continue with Microsoft" }),
    ).toHaveTextContent("Continue with Microsoft");
    expect(
      screen.getByRole("button", { name: "Continue with Apple" }),
    ).toHaveTextContent("Continue with Apple");
  });

  it("renders welcome sublines for each provider", () => {
    render(
      <SignInProviderButtons
        available={["google", "microsoft", "apple"]}
        loadingKind={null}
        onSignIn={mock()}
        variant="welcome"
      />,
    );

    expect(
      screen.getByText("Signs you up and connects your Google Calendar."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Signs you up and connects your Outlook calendar."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("You'll pick your calendar next."),
    ).toBeInTheDocument();
  });

  it("calls onSignIn with the clicked provider kind", async () => {
    const user = userEvent.setup();
    const onSignIn = mock();
    render(
      <SignInProviderButtons
        available={["google", "microsoft"]}
        loadingKind={null}
        onSignIn={onSignIn}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Continue with Microsoft" }),
    );

    expect(onSignIn).toHaveBeenCalledWith("microsoft");
  });
});
