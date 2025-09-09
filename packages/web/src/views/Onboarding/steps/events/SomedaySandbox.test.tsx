import React from "react";
import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { withProvider } from "../../components/OnboardingContext";
import { SomedaySandbox } from "./SomedaySandbox";

// Wrap the component with OnboardingProvider
const SomedaySandboxWithProvider = withProvider(SomedaySandbox);

// Mock required props for SomedaySandbox
const defaultProps = {
  currentStep: 1,
  totalSteps: 3,
  onNext: jest.fn(),
  onPrevious: jest.fn(),
  canNavigateNext: true,
  nextButtonDisabled: false,
  onComplete: jest.fn(),
  onSkip: jest.fn(),
};

describe("SomedaySandbox", () => {
  function setup() {
    render(<SomedaySandboxWithProvider {...defaultProps} />);
    // The first input is for "This Week", the second for "This Month"
    const inputs = screen.getAllByPlaceholderText("Add new task...");
    const weekTaskInput = inputs[0];
    const monthTaskInput = inputs[1];
    return { weekTaskInput, monthTaskInput };
  }

  it("should add a week task when Enter is pressed", async () => {
    const { weekTaskInput } = setup();
    await userEvent.type(weekTaskInput, "Test week task{enter}");
    expect(screen.getByText("Test week task")).toBeInTheDocument();
  });

  it("should add a month task when Enter is pressed", async () => {
    const { monthTaskInput } = setup();
    await userEvent.type(monthTaskInput, "Test month task{enter}");
    expect(screen.getByText("Test month task")).toBeInTheDocument();
  });

  it("should focus the month input after adding a week task with Enter", async () => {
    const { weekTaskInput, monthTaskInput } = setup();
    weekTaskInput.focus();
    await userEvent.type(weekTaskInput, "Focus test{enter}");
    expect(document.activeElement).toBe(monthTaskInput);
  });

  it("should not add empty week or month tasks", async () => {
    const { weekTaskInput, monthTaskInput } = setup();
    await userEvent.type(weekTaskInput, "{enter}");
    await userEvent.type(monthTaskInput, "{enter}");
    // There should be no new task items rendered (only the existing ones)
    const taskItems = screen.getAllByText(
      /File taxes|Get groceries|Start AI course|Book Airbnb|Return library books/,
    );
    expect(taskItems).toHaveLength(5); // Only the pre-existing tasks
  });

  it("should add week task on blur if input is not empty", async () => {
    const { weekTaskInput } = setup();
    await userEvent.type(weekTaskInput, "Blur week task");
    await userEvent.tab(); // move focus away to trigger blur
    expect(screen.getByText("Blur week task")).toBeInTheDocument();
  });

  it("should add month task on blur if input is not empty", async () => {
    const { monthTaskInput } = setup();
    await userEvent.type(monthTaskInput, "Blur month task");
    await userEvent.tab(); // move focus away to trigger blur
    expect(screen.getByText("Blur month task")).toBeInTheDocument();
  });
});
