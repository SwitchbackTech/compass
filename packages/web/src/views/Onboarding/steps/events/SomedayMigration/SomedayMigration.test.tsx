import React from "react";
import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { withProvider } from "../../../components/OnboardingContext";
import { SomedayMigration } from "./SomedayMigration";

// Wrap the component with OnboardingProvider
const SomedayMigrationWithProvider = withProvider(SomedayMigration);

// Mock required props for SomedayMigration
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

describe("SomedayMigration", () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    // Clear console.log mock
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console.log
    jest.restoreAllMocks();
  });

  function setup() {
    render(<SomedayMigrationWithProvider {...defaultProps} />);
    const eventItems = screen
      .getAllByText(/File taxes|Get groceries|Book Airbnb/)
      .map((text) => text.closest('[role="button"]'));
    return { eventItems };
  }

  it("should render the component with 3 someday events", () => {
    const { eventItems } = setup();

    expect(eventItems).toHaveLength(3);
    expect(screen.getByText("💸 File taxes")).toBeInTheDocument();
    expect(screen.getByText("🥗 Get groceries")).toBeInTheDocument();
    expect(screen.getByText("🏠 Book Airbnb")).toBeInTheDocument();
  });

  it("should render the sidebar with correct title", () => {
    setup();

    expect(screen.getByText("Someday Events")).toBeInTheDocument();
  });

  it("should render instructional text", () => {
    setup();

    expect(
      screen.getByText(
        "Click on any event to migrate it to next week or month",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "This is how you'll manage your someday events in the real app",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Try clicking on the events in the sidebar to see them in action",
      ),
    ).toBeInTheDocument();
  });

  it("should log to console when an event is clicked", async () => {
    const consoleSpy = jest.spyOn(console, "log");
    const { eventItems } = setup();

    // Click the first event
    await userEvent.click(eventItems[0]);

    expect(consoleSpy).toHaveBeenCalledWith(
      'Event clicked: "💸 File taxes" at index 0',
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      "This event would be migrated to next week or month",
    );
  });

  it("should log to console when the second event is clicked", async () => {
    const consoleSpy = jest.spyOn(console, "log");
    const { eventItems } = setup();

    // Click the second event
    await userEvent.click(eventItems[1]);

    expect(consoleSpy).toHaveBeenCalledWith(
      'Event clicked: "🥗 Get groceries" at index 1',
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      "This event would be migrated to next week or month",
    );
  });

  it("should log to console when the third event is clicked", async () => {
    const consoleSpy = jest.spyOn(console, "log");
    const { eventItems } = setup();

    // Click the third event
    await userEvent.click(eventItems[2]);

    expect(consoleSpy).toHaveBeenCalledWith(
      'Event clicked: "🏠 Book Airbnb" at index 2',
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      "This event would be migrated to next week or month",
    );
  });

  it("should log to console when an event is activated with Enter key", async () => {
    const consoleSpy = jest.spyOn(console, "log");
    const { eventItems } = setup();

    // Focus the first event and press Enter
    eventItems[0].focus();
    await userEvent.keyboard("{Enter}");

    expect(consoleSpy).toHaveBeenCalledWith(
      'Event clicked: "💸 File taxes" at index 0',
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      "This event would be migrated to next week or month",
    );
  });

  it("should log to console when an event is activated with Space key", async () => {
    const consoleSpy = jest.spyOn(console, "log");
    const { eventItems } = setup();

    // Focus the second event and press Space
    eventItems[1].focus();
    await userEvent.keyboard(" ");

    expect(consoleSpy).toHaveBeenCalledWith(
      'Event clicked: "🥗 Get groceries" at index 1',
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      "This event would be migrated to next week or month",
    );
  });

  it("should not log to console when other keys are pressed", async () => {
    const consoleSpy = jest.spyOn(console, "log");
    const { eventItems } = setup();

    // Focus the first event and press other keys
    eventItems[0].focus();
    await userEvent.keyboard("a");
    await userEvent.keyboard("b");
    await userEvent.keyboard("{Tab}");

    // Only the initial render logs should be present, no click logs
    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Event clicked:"),
    );
  });

  it("should have proper accessibility attributes", () => {
    const { eventItems } = setup();

    eventItems.forEach((item) => {
      expect(item).toBeInTheDocument();
      expect(item).toHaveAttribute("role", "button");
      expect(item).toHaveAttribute("tabIndex", "0");
    });
  });

  it("should render with OnboardingTwoRowLayout", () => {
    setup();

    // Check that the navigation buttons are present
    expect(screen.getByLabelText("Previous")).toBeInTheDocument();
    expect(screen.getByLabelText("Next")).toBeInTheDocument();
    expect(screen.getByText("SKIP INTRO")).toBeInTheDocument();
  });

  it("should render the rectangle in the middle column", () => {
    setup();

    // Check that the rectangle is rendered (it will be a div with the Rectangle styled component)
    const rectangle = document.querySelector('[class*="Rectangle"]');
    expect(rectangle).toBeInTheDocument();
  });
});
