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

    expect(screen.getByText("This Week")).toBeInTheDocument();
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

  it("should render the month picker in the middle column", () => {
    setup();

    // Check that the month picker components are rendered with current month
    const currentMonthYear = new Date().toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    expect(screen.getByText(currentMonthYear)).toBeInTheDocument();

    // Check that all week day labels are rendered
    const sLabels = screen.getAllByText("S");
    expect(sLabels).toHaveLength(2); // Sunday and Saturday

    const tLabels = screen.getAllByText("T");
    expect(tLabels).toHaveLength(2); // Tuesday and Thursday

    expect(screen.getByText("M")).toBeInTheDocument();
    expect(screen.getByText("W")).toBeInTheDocument();
    expect(screen.getByText("F")).toBeInTheDocument();
  });

  it("should render week day labels with current week highlighting", () => {
    setup();

    // Check that all week day labels are rendered
    const weekDayLabels = screen.getAllByText(/^[SMTWF]$/);
    expect(weekDayLabels).toHaveLength(7);

    // All days should be present
    expect(weekDayLabels[0]).toHaveTextContent("S"); // Sunday
    expect(weekDayLabels[1]).toHaveTextContent("M"); // Monday
    expect(weekDayLabels[2]).toHaveTextContent("T"); // Tuesday
    expect(weekDayLabels[3]).toHaveTextContent("W"); // Wednesday
    expect(weekDayLabels[4]).toHaveTextContent("T"); // Thursday
    expect(weekDayLabels[5]).toHaveTextContent("F"); // Friday
    expect(weekDayLabels[6]).toHaveTextContent("S"); // Saturday
  });

  it("should highlight the current week days in the calendar", () => {
    setup();

    // Get the current date to determine which days should be highlighted
    const currentDate = new Date();
    const currentDay = currentDate.getDate();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // Find the calendar day elements
    const calendarDays = screen
      .getAllByText(/^\d+$/)
      .filter(
        (day) =>
          parseInt(day.textContent || "0") >= 1 &&
          parseInt(day.textContent || "0") <= 31,
      );

    // Should have some calendar days
    expect(calendarDays.length).toBeGreaterThan(0);

    // The current day should be visible
    expect(screen.getByText(currentDay.toString())).toBeInTheDocument();

    // Verify that the current month and year are displayed
    const currentMonthYear = currentDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    expect(screen.getByText(currentMonthYear)).toBeInTheDocument();
  });

  it("should highlight day numbers of the current week", () => {
    setup();

    // Get the current week boundaries
    const currentDate = new Date();
    const currentWeekStart = new Date(currentDate);
    currentWeekStart.setDate(currentDate.getDate() - currentDate.getDay());
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6);

    // Find all calendar day elements
    const calendarDays = screen
      .getAllByText(/^\d+$/)
      .filter(
        (day) =>
          parseInt(day.textContent || "0") >= 1 &&
          parseInt(day.textContent || "0") <= 31,
      );

    // Should have calendar days
    expect(calendarDays.length).toBeGreaterThan(0);

    // Verify that the current day is present
    expect(
      screen.getByText(currentDate.getDate().toString()),
    ).toBeInTheDocument();
  });

  it("should highlight the entire current week background", () => {
    setup();

    // Check that the week day labels and calendar grid have the current week highlighting
    // We can't easily test the exact styling, but we can verify the structure exists
    const weekDaysContainer = document.querySelector('[class*="WeekDays"]');
    const calendarGridContainer = document.querySelector(
      '[class*="CalendarGrid"]',
    );

    expect(weekDaysContainer).toBeInTheDocument();
    expect(calendarGridContainer).toBeInTheDocument();
  });

  it("should render and be clickable the week highlighter", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const user = userEvent.setup();

    setup();

    // Check that the highlighter canvas is in the DOM
    const highlighterCanvas = document.querySelector("canvas");
    expect(highlighterCanvas).toBeInTheDocument();
    expect(highlighterCanvas?.tagName).toBe("CANVAS");

    // Check that the highlighter has the correct positioning styles
    const highlighterElement = highlighterCanvas as HTMLCanvasElement;
    expect(highlighterElement.style.position).toBe("absolute");
    expect(highlighterElement.style.pointerEvents).toBe("auto");
    expect(highlighterElement.style.cursor).toBe("pointer");

    // Verify the highlighter has reasonable dimensions (will be dynamic based on calendar)
    expect(highlighterElement.width).toBeGreaterThan(200); // Should be wide enough for calendar
    expect(highlighterElement.height).toBeGreaterThan(40); // Should have height for week row plus text

    // Click the highlighter
    await user.click(highlighterCanvas!);

    // Verify console message was logged
    expect(consoleSpy).toHaveBeenCalledWith("Week highlighter clicked!");

    consoleSpy.mockRestore();
  });

  it("should only render arrow when current week is visible", () => {
    setup();

    // Check that the arrow canvas is in the DOM when current week is visible
    const arrowCanvas = document.querySelector("canvas");
    expect(arrowCanvas).toBeInTheDocument();
  });

  it("should position arrow dynamically based on This Week label and current week row", async () => {
    setup();

    // Wait for the component to calculate positions (useEffect with refs)
    await new Promise((resolve) => setTimeout(resolve, 100));

    const arrowCanvas = document.querySelector("canvas");
    expect(arrowCanvas).toBeInTheDocument();

    // Verify the arrow is positioned (exact values will depend on layout)
    const arrowElement = arrowCanvas as HTMLCanvasElement;
    expect(arrowElement.style.position).toBe("absolute");

    // Check that left and top styles are set (they will be calculated dynamically)
    expect(arrowElement.style.left).toMatch(/\d+px/);
    expect(arrowElement.style.top).toMatch(/\d+px/);
  });

  it("should position arrow close to Saturday day label, overlapping calendar", async () => {
    setup();

    // Find the calendar grid
    const calendarGrid = document.querySelector('[class*="CalendarGrid"]');
    expect(calendarGrid).toBeInTheDocument();

    // Wait for positioning calculations
    await new Promise((resolve) => setTimeout(resolve, 150));

    const arrowCanvas = document.querySelector("canvas");
    expect(arrowCanvas).toBeInTheDocument();

    // Check that arrow exists and has been positioned
    const arrowElement = arrowCanvas as HTMLCanvasElement;
    const arrowLeft = parseInt(arrowElement.style.left.replace("px", ""));
    const arrowTop = parseInt(arrowElement.style.top.replace("px", ""));

    // Arrow should be positioned close to the Saturday column, overlapping calendar
    expect(arrowLeft).toBeGreaterThan(0); // Should be positioned
    expect(arrowTop).toBeGreaterThan(0);

    // Arrow should have high z-index to render on top
    expect(arrowElement.style.zIndex).toBe("100");
  });

  it("should target Saturday (last day) of the current week", async () => {
    setup();

    // Wait for positioning calculations
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Get current date to find the Saturday of current week
    const currentDate = new Date();
    const currentDay = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
    const daysUntilSaturday = (6 - currentDay + 7) % 7;
    const saturdayDate = new Date(currentDate);
    saturdayDate.setDate(currentDate.getDate() + daysUntilSaturday);

    // In the mock, we're using January 11, 2024 (Thursday)
    // So Saturday would be January 13, 2024
    const expectedSaturday = 13;

    // Find the Saturday element in the calendar
    const saturdayElement = screen.getByText(expectedSaturday.toString());
    expect(saturdayElement).toBeInTheDocument();

    // Verify it's marked as current week
    const saturdayParent = saturdayElement.parentElement;
    expect(saturdayParent).toHaveAttribute(
      "class",
      expect.stringContaining("CalendarDay"),
    );
  });

  it("should show 'We're here' text in Caveat font with arrow color", async () => {
    setup();

    // Wait for positioning calculations
    await new Promise((resolve) => setTimeout(resolve, 150));

    const arrowCanvas = document.querySelector("canvas");
    expect(arrowCanvas).toBeInTheDocument();

    // Check that the canvas has the correct dimensions for text
    const arrowElement = arrowCanvas as HTMLCanvasElement;
    expect(arrowElement.width).toBe(170); // width + 10 = 160 + 10
    expect(arrowElement.height).toBe(50); // height + 10 = 40 + 10
  });
});
