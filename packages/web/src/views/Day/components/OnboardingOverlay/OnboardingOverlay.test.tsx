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
    expect(screen.getByText(/Type.*to create a task/i)).toBeInTheDocument();
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

  it("should show keyboard shortcut hint", () => {
    const onDismiss = jest.fn();

    render(<OnboardingOverlay onDismiss={onDismiss} />);

    // Text is split across elements, so check for parts
    expect(screen.getByText(/Type/i)).toBeInTheDocument();
    expect(screen.getByText(/to create a task/i)).toBeInTheDocument();
    expect(screen.getByText("c")).toBeInTheDocument(); // The kbd element contains "c"
  });
});
