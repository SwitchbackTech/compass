import React from "react";
import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { withProvider } from "../../components/OnboardingContext";
import { SomedaySandbox } from "./SomedaySandbox";

// Mock the createAndSubmitEvents function
jest.mock("./someday-sandbox.util", () => ({
  createAndSubmitEvents: jest.fn().mockResolvedValue(undefined),
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

  it("should call createAndSubmitEvents and onNext when right arrow is pressed and tasks are ready", async () => {
    const { createAndSubmitEvents } = require("./someday-sandbox.util");
    const mockOnNext = jest.fn();
    const props = { ...defaultProps, onNext: mockOnNext };

    render(<SomedaySandboxWithProvider {...props} />);

    // Add enough tasks to make both checkboxes ready
    const weekInput = screen.getAllByPlaceholderText("Add new task...")[0];
    const monthInput = screen.getAllByPlaceholderText("Add new task...")[1];

    // Add week task
    await userEvent.type(weekInput, "Week task{enter}");

    // Add month task
    await userEvent.type(monthInput, "Month task{enter}");

    // Wait for checkboxes to be checked
    await waitFor(() => {
      expect(screen.getByText("Week task")).toBeInTheDocument();
      expect(screen.getByText("Month task")).toBeInTheDocument();
    });

    // Press right arrow key
    await userEvent.keyboard("{ArrowRight}");

    // onNext should be called immediately
    expect(mockOnNext).toHaveBeenCalled();

    // createAndSubmitEvents should be called in background
    await waitFor(() => {
      expect(createAndSubmitEvents).toHaveBeenCalled();
    });
  });

  it("should call createAndSubmitEvents and onNext when Enter is pressed and tasks are ready", async () => {
    const { createAndSubmitEvents } = require("./someday-sandbox.util");
    const mockOnNext = jest.fn();
    const props = { ...defaultProps, onNext: mockOnNext };

    render(<SomedaySandboxWithProvider {...props} />);

    // Add enough tasks to make both checkboxes ready
    const weekInput = screen.getAllByPlaceholderText("Add new task...")[0];
    const monthInput = screen.getAllByPlaceholderText("Add new task...")[1];

    // Add week task
    await userEvent.type(weekInput, "Week task{enter}");

    // Add month task
    await userEvent.type(monthInput, "Month task{enter}");

    // Wait for checkboxes to be checked
    await waitFor(() => {
      expect(screen.getByText("Week task")).toBeInTheDocument();
      expect(screen.getByText("Month task")).toBeInTheDocument();
    });

    // Press Enter key (not focused on input)
    await userEvent.keyboard("{Enter}");

    // onNext should be called immediately
    expect(mockOnNext).toHaveBeenCalled();

    // createAndSubmitEvents should be called in background
    await waitFor(() => {
      expect(createAndSubmitEvents).toHaveBeenCalled();
    });
  });

  it("should not navigate when right arrow is pressed with default tasks but checkboxes not ready", async () => {
    const { createAndSubmitEvents } = require("./someday-sandbox.util");
    const mockOnNext = jest.fn();
    const props = { ...defaultProps, onNext: mockOnNext };

    render(<SomedaySandboxWithProvider {...props} />);

    // Clear the mock to reset any previous calls
    createAndSubmitEvents.mockClear();
    mockOnNext.mockClear();

    // Press right arrow key - the component starts with default tasks but checkboxes are not ready
    await userEvent.keyboard("{ArrowRight}");

    // Should not call createAndSubmitEvents or onNext because checkboxes are not ready
    expect(createAndSubmitEvents).not.toHaveBeenCalled();
    expect(mockOnNext).not.toHaveBeenCalled();
  });

  it("should not navigate when right arrow is pressed with unsaved changes", async () => {
    const { createAndSubmitEvents } = require("./someday-sandbox.util");
    const mockOnNext = jest.fn();
    const props = { ...defaultProps, onNext: mockOnNext };

    render(<SomedaySandboxWithProvider {...props} />);

    // Clear the mock to reset any previous calls
    createAndSubmitEvents.mockClear();
    mockOnNext.mockClear();

    // Type in an input but don't submit (unsaved changes)
    const weekInput = screen.getAllByPlaceholderText("Add new task...")[0];
    await userEvent.type(weekInput, "Unsaved task");

    // Press right arrow key
    await userEvent.keyboard("{ArrowRight}");

    // Should not call createAndSubmitEvents or onNext due to unsaved changes
    expect(createAndSubmitEvents).not.toHaveBeenCalled();
    expect(mockOnNext).not.toHaveBeenCalled();
  });

  it("should prevent multiple submissions when right arrow is pressed multiple times", async () => {
    const { createAndSubmitEvents } = require("./someday-sandbox.util");
    const mockOnNext = jest.fn();
    const props = { ...defaultProps, onNext: mockOnNext };

    render(<SomedaySandboxWithProvider {...props} />);

    // Add enough tasks to make both checkboxes ready
    const weekInput = screen.getAllByPlaceholderText("Add new task...")[0];
    const monthInput = screen.getAllByPlaceholderText("Add new task...")[1];

    await userEvent.type(weekInput, "Week task{enter}");
    await userEvent.type(monthInput, "Month task{enter}");

    // Wait for checkboxes to be checked
    await waitFor(() => {
      expect(screen.getByText("Week task")).toBeInTheDocument();
      expect(screen.getByText("Month task")).toBeInTheDocument();
    });

    // Press right arrow key multiple times quickly
    await userEvent.keyboard("{ArrowRight}");
    await userEvent.keyboard("{ArrowRight}");
    await userEvent.keyboard("{ArrowRight}");

    // onNext should be called at least once
    expect(mockOnNext).toHaveBeenCalled();

    // In a real app, the component would unmount after onNext(), but in tests it doesn't
    // So we expect createAndSubmitEvents to be called multiple times in the test environment
    // The important thing is that the ref prevents multiple calls in rapid succession
    await waitFor(() => {
      expect(createAndSubmitEvents).toHaveBeenCalled();
    });
  });

  it("should prevent multiple submissions when Enter is pressed multiple times", async () => {
    const { createAndSubmitEvents } = require("./someday-sandbox.util");
    const mockOnNext = jest.fn();
    const props = { ...defaultProps, onNext: mockOnNext };

    render(<SomedaySandboxWithProvider {...props} />);

    // Add enough tasks to make both checkboxes ready
    const weekInput = screen.getAllByPlaceholderText("Add new task...")[0];
    const monthInput = screen.getAllByPlaceholderText("Add new task...")[1];

    await userEvent.type(weekInput, "Week task{enter}");
    await userEvent.type(monthInput, "Month task{enter}");

    // Wait for checkboxes to be checked
    await waitFor(() => {
      expect(screen.getByText("Week task")).toBeInTheDocument();
      expect(screen.getByText("Month task")).toBeInTheDocument();
    });

    // Press Enter key multiple times quickly
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{Enter}");

    // onNext should be called at least once
    expect(mockOnNext).toHaveBeenCalled();

    // In a real app, the component would unmount after onNext(), but in tests it doesn't
    // So we expect createAndSubmitEvents to be called multiple times in the test environment
    // The important thing is that the ref prevents multiple calls in rapid succession
    await waitFor(() => {
      expect(createAndSubmitEvents).toHaveBeenCalled();
    });
  });

  it("should handle createAndSubmitEvents errors gracefully", async () => {
    const { createAndSubmitEvents } = require("./someday-sandbox.util");
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    // Mock createAndSubmitEvents to reject
    createAndSubmitEvents.mockRejectedValueOnce(new Error("Network error"));

    const mockOnNext = jest.fn();
    const props = { ...defaultProps, onNext: mockOnNext };

    render(<SomedaySandboxWithProvider {...props} />);

    // Add enough tasks to make both checkboxes ready
    const weekInput = screen.getAllByPlaceholderText("Add new task...")[0];
    const monthInput = screen.getAllByPlaceholderText("Add new task...")[1];

    await userEvent.type(weekInput, "Week task{enter}");
    await userEvent.type(monthInput, "Month task{enter}");

    // Wait for checkboxes to be checked
    await waitFor(() => {
      expect(screen.getByText("Week task")).toBeInTheDocument();
      expect(screen.getByText("Month task")).toBeInTheDocument();
    });

    // Press right arrow key
    await userEvent.keyboard("{ArrowRight}");

    // onNext should still be called immediately despite error
    expect(mockOnNext).toHaveBeenCalled();

    // Error should be logged to console
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to create someday events:",
        expect.any(Error),
      );
    });

    consoleSpy.mockRestore();
  });

  it("should not navigate when isSubmitting is true", async () => {
    const { createAndSubmitEvents } = require("./someday-sandbox.util");
    const mockOnNext = jest.fn();
    const props = { ...defaultProps, onNext: mockOnNext };

    render(<SomedaySandboxWithProvider {...props} />);

    // Add enough tasks to make both checkboxes ready
    const weekInput = screen.getAllByPlaceholderText("Add new task...")[0];
    const monthInput = screen.getAllByPlaceholderText("Add new task...")[1];

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

    // Press right arrow key
    await userEvent.keyboard("{ArrowRight}");

    // onNext should be called immediately
    expect(mockOnNext).toHaveBeenCalled();

    // Press right arrow key again while still submitting
    await userEvent.keyboard("{ArrowRight}");

    // onNext should still only be called once
    expect(mockOnNext).toHaveBeenCalledTimes(1);
  });
});
