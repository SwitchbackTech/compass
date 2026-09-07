import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ProviderKind } from "@core/types/sync/identity.contracts";
import { SignInProviderButtons } from "@web/components/AuthModal/components/SignInProviderButtons";
import { describe, expect, it, mock } from "bun:test";

const customLabels: Record<ProviderKind, string> = {
  google: "Connect Google Calendar",
  microsoft: "Connect Microsoft Calendar",
  apple: "Connect Apple Calendar",
};

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
    expect(
      screen.queryByText("Signs you up and connects your Google Calendar."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Signs you up and connects your Outlook calendar."),
    ).not.toBeInTheDocument();
  });

  it("renders custom labels as accessible names", () => {
    render(
      <SignInProviderButtons
        available={["google", "microsoft", "apple"]}
        labels={customLabels}
        loadingKind={null}
        onSignIn={mock()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Connect Google Calendar" }),
    ).toHaveTextContent("Connect Google Calendar");
    expect(
      screen.getByRole("button", { name: "Connect Microsoft Calendar" }),
    ).toHaveTextContent("Connect Microsoft Calendar");
    expect(
      screen.getByRole("button", { name: "Connect Apple Calendar" }),
    ).toHaveTextContent("Connect Apple Calendar");
  });

  it("hides shortcut chips when shortcutKeys is null", () => {
    render(
      <SignInProviderButtons
        available={["google", "microsoft", "apple"]}
        loadingKind={null}
        onSignIn={mock()}
        shortcutKeys={null}
      />,
    );

    expect(screen.queryByText("G")).toBeNull();
    expect(screen.queryByText("M")).toBeNull();
    expect(screen.queryByText("A")).toBeNull();
  });

  it("shows busyLabel and aria-busy on the loading button and disables the rest", () => {
    render(
      <SignInProviderButtons
        available={["google", "microsoft", "apple"]}
        busyLabel={(kind) => `Opening ${kind}…`}
        labels={customLabels}
        loadingKind="microsoft"
        onSignIn={mock()}
        shortcutKeys={null}
      />,
    );

    const busyButton = screen.getByRole("button", {
      name: "Opening microsoft…",
    });
    expect(busyButton).toHaveAttribute("aria-busy", "true");
    expect(busyButton).toHaveTextContent("Opening microsoft…");
    expect(
      screen.getByRole("button", { name: "Connect Google Calendar" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Connect Apple Calendar" }),
    ).toBeDisabled();
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
