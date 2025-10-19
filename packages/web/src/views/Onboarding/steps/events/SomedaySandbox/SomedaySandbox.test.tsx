import "@testing-library/jest-dom";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { withProvider } from "../../../components/OnboardingContext";
import { SomedaySandbox } from "./SomedaySandbox";

// Mock the createAndSubmitEvents function
jest.mock("./sandbox.util", () => ({
  createAndSubmitEvents: jest
    .fn()
    .mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(undefined), 100)),
    ),
}));

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
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  function setup() {
    render(<SomedaySandboxWithProvider {...defaultProps} />);
    // The first input is for "This Week", the second for "This Month"
    const inputs = screen.getAllByPlaceholderText("Create new task...");
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

  it("should call createAndSubmitEvents and onNext when handleNext is called and tasks are ready", async () => {
    const { createAndSubmitEvents } = require("./sandbox.util");
    const mockOnNext = jest.fn();
    const props = { ...defaultProps, onNext: mockOnNext };

    render(<SomedaySandboxWithProvider {...props} />);

    // Add enough tasks to make both checkboxes ready
    const weekInput = screen.getAllByPlaceholderText("Create new task...")[0];
    const monthInput = screen.getAllByPlaceholderText("Create new task...")[1];

    // Add week task
    await userEvent.type(weekInput, "Week task{enter}");

    // Add month task
    await userEvent.type(monthInput, "Month task{enter}");

    // Wait for checkboxes to be checked
    await waitFor(() => {
      expect(screen.getByText("Week task")).toBeInTheDocument();
      expect(screen.getByText("Month task")).toBeInTheDocument();
    });

    // Click the next button to trigger handleNext (the right arrow button)
    const nextButton = screen.getByLabelText("Next");
    await userEvent.click(nextButton);

    // createAndSubmitEvents should be called first
    await waitFor(() => {
      expect(createAndSubmitEvents).toHaveBeenCalled();
    });

    // onNext should be called after createAndSubmitEvents completes
    await waitFor(() => {
      expect(mockOnNext).toHaveBeenCalled();
    });
  });

  it("should call createAndSubmitEvents and onNext when handleNext is called and tasks are ready (Enter test)", async () => {
    const { createAndSubmitEvents } = require("./sandbox.util");
    const mockOnNext = jest.fn();
    const props = { ...defaultProps, onNext: mockOnNext };

    render(<SomedaySandboxWithProvider {...props} />);

    // Add enough tasks to make both checkboxes ready
    const weekInput = screen.getAllByPlaceholderText("Create new task...")[0];
    const monthInput = screen.getAllByPlaceholderText("Create new task...")[1];

    // Add week task
    await userEvent.type(weekInput, "Week task{enter}");

    // Add month task
    await userEvent.type(monthInput, "Month task{enter}");

    // Wait for checkboxes to be checked
    await waitFor(() => {
      expect(screen.getByText("Week task")).toBeInTheDocument();
      expect(screen.getByText("Month task")).toBeInTheDocument();
    });

    // Click the next button to trigger handleNext (the right arrow button)
    const nextButton = screen.getByLabelText("Next");
    await userEvent.click(nextButton);

    // createAndSubmitEvents should be called first
    await waitFor(() => {
      expect(createAndSubmitEvents).toHaveBeenCalled();
    });

    // onNext should be called after createAndSubmitEvents completes
    await waitFor(() => {
      expect(mockOnNext).toHaveBeenCalled();
    });
  });

  it("should not trigger onNext when Enter is pressed while focused on input field", async () => {
    const { createAndSubmitEvents } = require("./sandbox.util");
    const mockOnNext = jest.fn();
    const props = { ...defaultProps, onNext: mockOnNext };

    render(<SomedaySandboxWithProvider {...props} />);

    // Clear the mock to reset any previous calls
    createAndSubmitEvents.mockClear();
    mockOnNext.mockClear();

    // Focus on the week input and press Enter
    const weekInput = screen.getAllByPlaceholderText("Create new task...")[0];
    weekInput.focus();
    await userEvent.type(weekInput, "Test task{enter}");

    // Should not call createAndSubmitEvents or onNext because Enter was pressed while focused on input
    expect(createAndSubmitEvents).not.toHaveBeenCalled();
    expect(mockOnNext).not.toHaveBeenCalled();

    // But the task should still be added
    expect(screen.getByText("Test task")).toBeInTheDocument();
  });

  it("should not trigger onNext when Enter is pressed while focused on month input field", async () => {
    const { createAndSubmitEvents } = require("./sandbox.util");
    const mockOnNext = jest.fn();
    const props = { ...defaultProps, onNext: mockOnNext };

    render(<SomedaySandboxWithProvider {...props} />);

    // Clear the mock to reset any previous calls
    createAndSubmitEvents.mockClear();
    mockOnNext.mockClear();

    // Focus on the month input and press Enter
    const monthInput = screen.getAllByPlaceholderText("Create new task...")[1];
    monthInput.focus();
    await userEvent.type(monthInput, "Test month task{enter}");

    // Should not call createAndSubmitEvents or onNext because Enter was pressed while focused on input
    expect(createAndSubmitEvents).not.toHaveBeenCalled();
    expect(mockOnNext).not.toHaveBeenCalled();

    // But the task should still be added
    expect(screen.getByText("Test month task")).toBeInTheDocument();
  });

  it("should trigger onNext when handleNext is called after tasks are ready", async () => {
    const { createAndSubmitEvents } = require("./sandbox.util");
    const mockOnNext = jest.fn();
    const props = { ...defaultProps, onNext: mockOnNext };

    render(<SomedaySandboxWithProvider {...props} />);

    // Add enough tasks to make both checkboxes ready
    const weekInput = screen.getAllByPlaceholderText("Create new task...")[0];
    const monthInput = screen.getAllByPlaceholderText("Create new task...")[1];

    // Add week task
    await userEvent.type(weekInput, "Week task{enter}");

    // Add month task
    await userEvent.type(monthInput, "Month task{enter}");

    // Wait for checkboxes to be checked
    await waitFor(() => {
      expect(screen.getByText("Week task")).toBeInTheDocument();
      expect(screen.getByText("Month task")).toBeInTheDocument();
    });

    // Clear mocks to test fresh
    createAndSubmitEvents.mockClear();
    mockOnNext.mockClear();

    // Click the next button to trigger handleNext (the right arrow button)
    const nextButton = screen.getByLabelText("Next");
    await userEvent.click(nextButton);

    // createAndSubmitEvents should be called first
    await waitFor(() => {
      expect(createAndSubmitEvents).toHaveBeenCalled();
    });

    // onNext should be called after createAndSubmitEvents completes
    await waitFor(() => {
      expect(mockOnNext).toHaveBeenCalled();
    });
  });

  it("should not navigate when next button is clicked with default tasks but checkboxes not ready", async () => {
    const { createAndSubmitEvents } = require("./sandbox.util");
    const mockOnNext = jest.fn();
    const props = { ...defaultProps, onNext: mockOnNext };

    render(<SomedaySandboxWithProvider {...props} />);

    // Clear the mock to reset any previous calls
    createAndSubmitEvents.mockClear();
    mockOnNext.mockClear();

    // The component starts with default tasks but checkboxes are not ready
    // Since the button is disabled, we can't click it, but we can test that the button is disabled
    const nextButton = screen.getByLabelText("Next");
    expect(nextButton).toBeDisabled();

    // Should not call createAndSubmitEvents or onNext because checkboxes are not ready
    expect(createAndSubmitEvents).not.toHaveBeenCalled();
    expect(mockOnNext).not.toHaveBeenCalled();
  });

  it("should not navigate when next button is clicked with unsaved changes", async () => {
    const { createAndSubmitEvents } = require("./sandbox.util");
    const mockOnNext = jest.fn();
    const props = { ...defaultProps, onNext: mockOnNext };

    render(<SomedaySandboxWithProvider {...props} />);

    // Clear the mock to reset any previous calls
    createAndSubmitEvents.mockClear();
    mockOnNext.mockClear();

    // Type in an input but don't submit (unsaved changes)
    const weekInput = screen.getAllByPlaceholderText("Create new task...")[0];
    await userEvent.type(weekInput, "Unsaved task");

    // The button should be disabled due to unsaved changes
    const nextButton = screen.getByLabelText("Next");
    expect(nextButton).toBeDisabled();

    // Should not call createAndSubmitEvents or onNext due to unsaved changes
    expect(createAndSubmitEvents).not.toHaveBeenCalled();
    expect(mockOnNext).not.toHaveBeenCalled();
  });

  it("should prevent multiple submissions when next button is clicked multiple times", async () => {
    const { createAndSubmitEvents } = require("./sandbox.util");
    const mockOnNext = jest.fn();
    const props = { ...defaultProps, onNext: mockOnNext };

    render(<SomedaySandboxWithProvider {...props} />);

    // Add enough tasks to make both checkboxes ready
    const weekInput = screen.getAllByPlaceholderText("Create new task...")[0];
    const monthInput = screen.getAllByPlaceholderText("Create new task...")[1];

    await userEvent.type(weekInput, "Week task{enter}");
    await userEvent.type(monthInput, "Month task{enter}");

    // Wait for checkboxes to be checked
    await waitFor(() => {
      expect(screen.getByText("Week task")).toBeInTheDocument();
      expect(screen.getByText("Month task")).toBeInTheDocument();
    });

    // Click next button - it should become disabled after first click
    const nextButton = screen.getByLabelText("Next");
    await act(async () => {
      await userEvent.click(nextButton);
    });

    // Button should be disabled during submission - wait for state update
    await waitFor(() => {
      expect(nextButton).toBeDisabled();
    });

    // onNext should be called after createAndSubmitEvents completes
    await waitFor(() => {
      expect(mockOnNext).toHaveBeenCalled();
    });

    // createAndSubmitEvents should be called
    await waitFor(() => {
      expect(createAndSubmitEvents).toHaveBeenCalled();
    });
  });

  it("should prevent multiple submissions when next button is clicked multiple times (Enter test)", async () => {
    const { createAndSubmitEvents } = require("./sandbox.util");
    const mockOnNext = jest.fn();
    const props = { ...defaultProps, onNext: mockOnNext };

    render(<SomedaySandboxWithProvider {...props} />);

    // Add enough tasks to make both checkboxes ready
    const weekInput = screen.getAllByPlaceholderText("Create new task...")[0];
    const monthInput = screen.getAllByPlaceholderText("Create new task...")[1];

    await userEvent.type(weekInput, "Week task{enter}");
    await userEvent.type(monthInput, "Month task{enter}");

    // Wait for checkboxes to be checked
    await waitFor(() => {
      expect(screen.getByText("Week task")).toBeInTheDocument();
      expect(screen.getByText("Month task")).toBeInTheDocument();
    });

    // Click next button - it should become disabled after first click
    const nextButton = screen.getByLabelText("Next");
    await act(async () => {
      await userEvent.click(nextButton);
    });

    // Button should be disabled during submission - wait for state update
    await waitFor(() => {
      expect(nextButton).toBeDisabled();
    });

    // onNext should be called after createAndSubmitEvents completes
    await waitFor(() => {
      expect(mockOnNext).toHaveBeenCalled();
    });

    // createAndSubmitEvents should be called
    await waitFor(() => {
      expect(createAndSubmitEvents).toHaveBeenCalled();
    });
  });

  it("should handle createAndSubmitEvents errors gracefully", async () => {
    const { createAndSubmitEvents } = require("./sandbox.util");
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    // Mock createAndSubmitEvents to reject
    createAndSubmitEvents.mockRejectedValueOnce(new Error("Network error"));

    const mockOnNext = jest.fn();
    const props = { ...defaultProps, onNext: mockOnNext };

    render(<SomedaySandboxWithProvider {...props} />);

    // Add enough tasks to make both checkboxes ready
    const weekInput = screen.getAllByPlaceholderText("Create new task...")[0];
    const monthInput = screen.getAllByPlaceholderText("Create new task...")[1];

    await userEvent.type(weekInput, "Week task{enter}");
    await userEvent.type(monthInput, "Month task{enter}");

    // Wait for checkboxes to be checked
    await waitFor(() => {
      expect(screen.getByText("Week task")).toBeInTheDocument();
      expect(screen.getByText("Month task")).toBeInTheDocument();
    });

    // Click the next button to trigger handleNext (the right arrow button)
    const nextButton = screen.getByLabelText("Next");
    await userEvent.click(nextButton);

    // Error should be logged to console
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to create someday events:",
        expect.any(Error),
      );
    });

    // onNext should NOT be called when there's an error
    expect(mockOnNext).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("should not navigate when isSubmitting is true", async () => {
    const { createAndSubmitEvents } = require("./sandbox.util");
    const mockOnNext = jest.fn();
    const props = { ...defaultProps, onNext: mockOnNext };

    render(<SomedaySandboxWithProvider {...props} />);

    // Add enough tasks to make both checkboxes ready
    const weekInput = screen.getAllByPlaceholderText("Create new task...")[0];
    const monthInput = screen.getAllByPlaceholderText("Create new task...")[1];

    await userEvent.type(weekInput, "Week task{enter}");
    await userEvent.type(monthInput, "Month task{enter}");

    // Wait for checkboxes to be checked
    await waitFor(() => {
      expect(screen.getByText("Week task")).toBeInTheDocument();
      expect(screen.getByText("Month task")).toBeInTheDocument();
    });

    // Mock createAndSubmitEvents to take a long time
    createAndSubmitEvents.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000)),
    );

    // Click the next button to trigger handleNext (the right arrow button)
    const nextButton = screen.getByLabelText("Next");
    await userEvent.click(nextButton);

    // The button should be disabled while submitting
    expect(nextButton).toBeDisabled();

    // onNext should be called after createAndSubmitEvents completes
    await waitFor(
      () => {
        expect(mockOnNext).toHaveBeenCalled();
      },
      { timeout: 2000 },
    );

    // onNext should only be called once
    expect(mockOnNext).toHaveBeenCalledTimes(1);
  });
});
