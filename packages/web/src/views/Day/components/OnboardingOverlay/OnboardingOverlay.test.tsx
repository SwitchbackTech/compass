import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { OnboardingOverlay } from "./OnboardingOverlay";

describe("OnboardingOverlay", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should render welcome message", () => {
    const onDismiss = jest.fn();

    render(<OnboardingOverlay onDismiss={onDismiss} />);

    expect(screen.getByText("Welcome to Compass")).toBeInTheDocument();
    expect(
      screen.getByText(/You're all set! Try creating a task/i),
    ).toBeInTheDocument();
  });

  it("should dismiss when close button is clicked", async () => {
    const onDismiss = jest.fn();

    render(<OnboardingOverlay onDismiss={onDismiss} />);

    const closeButton = screen.getByLabelText("Dismiss");
    await userEvent.click(closeButton);

    expect(onDismiss).toHaveBeenCalled();
    expect(localStorage.getItem(STORAGE_KEYS.ONBOARDING_OVERLAY_SEEN)).toBe(
      "true",
    );
  });

  it("should show cmd+k shortcut hint", () => {
    const onDismiss = jest.fn();

    render(<OnboardingOverlay onDismiss={onDismiss} />);

    expect(screen.getByText(/⌘ \+ K/i)).toBeInTheDocument();
  });
});
