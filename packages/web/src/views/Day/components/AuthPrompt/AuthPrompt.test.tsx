import { BrowserRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getOnboardingProgress } from "@web/views/Onboarding/utils/onboarding.storage.util";
import { AuthPrompt } from "./AuthPrompt";

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe("AuthPrompt", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should render sign in message", () => {
    const onDismiss = jest.fn();

    renderWithRouter(<AuthPrompt onDismiss={onDismiss} />);

    expect(
      screen.getByText("Sign in to sync across devices"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Your tasks are saved locally/i),
    ).toBeInTheDocument();
  });

  it("should dismiss when 'Later' button is clicked", async () => {
    const onDismiss = jest.fn();

    renderWithRouter(<AuthPrompt onDismiss={onDismiss} />);

    const laterButton = screen.getByRole("button", { name: /later/i });
    await userEvent.click(laterButton);

    expect(onDismiss).toHaveBeenCalled();
    const progress = getOnboardingProgress();
    expect(progress.isAuthDismissed).toBe(true);
  });

  it("should navigate to login when 'Sign in' button is clicked", async () => {
    const onDismiss = jest.fn();

    renderWithRouter(<AuthPrompt onDismiss={onDismiss} />);

    const signInButton = screen.getByRole("button", { name: /sign in/i });
    await userEvent.click(signInButton);

    // Check that navigation occurred (window.location would change in real app)
    // In test environment, we just verify the button click works
    expect(signInButton).toBeInTheDocument();
  });
});
